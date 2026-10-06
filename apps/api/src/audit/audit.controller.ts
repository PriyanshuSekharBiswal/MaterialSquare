import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { StaffGuard } from "../auth/access.guard";
import { validate } from "../common/validation";
import { PrismaService } from "../prisma/prisma.service";
import type { StaffRequest } from "../auth/staff-request";

const filters = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    action: z.string().trim().max(100).optional(),
    entityType: z.string().trim().max(100).optional(),
    entityId: z.string().trim().max(200).optional(),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "End date must be on or after start date",
    path: ["to"],
  });

@Controller("admin/audit")
@UseGuards(StaffGuard)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("recent")
  async recent(@Req() req: StaffRequest) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const categories = recentCategoriesForRole(req.user.role);
    const allowedEntityTypes = Object.entries(recentEntityCategories)
      .filter(([, category]) => categories.includes(category))
      .map(([entityType]) => entityType);
    const where = {
      createdAt: { gte: since },
      entityType: { in: allowedEntityTypes },
    };
    const [entries, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
          staff: { select: { name: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      since: since.toISOString(),
      categories,
      items: entries.map((entry) => {
        const metadata =
          entry.metadata &&
          typeof entry.metadata === "object" &&
          !Array.isArray(entry.metadata)
            ? (entry.metadata as Record<string, unknown>)
            : {};
        const changes = Array.isArray(metadata.changes) ? metadata.changes : [];
        const fieldNames = changes
          .map((change) =>
            change && typeof change === "object" && "field" in change
              ? String(change.field || "")
              : "",
          )
          .filter(Boolean);
        const changedFields = Array.isArray(metadata.changes)
          ? fieldNames
          : Array.isArray(metadata.changedFields)
            ? metadata.changedFields.map(String)
            : Array.isArray(metadata.fields)
              ? metadata.fields.map(String)
              : [];
        const title =
          typeof metadata.productName === "string"
            ? metadata.productName
            : typeof metadata.originalName === "string"
              ? metadata.originalName
            : recentEntityTitles[entry.entityType] || "Workspace settings";

        return {
          id: entry.id,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          createdAt: entry.createdAt,
          title,
          category:
            recentEntityCategories[entry.entityType] || "Settings & team",
          entityLabel:
            recentEntityTitles[entry.entityType] || "Workspace settings",
          actionLabel: describeRecentAction(entry.action),
          changedFields: [...new Set(changedFields)].slice(0, 8),
          staff: entry.staff,
        };
      }),
      total,
      limit: 50,
    };
  }

  @Get()
  async list(@Query() query: unknown) {
    const { page, action, entityType, entityId, from, to } = validate(
      filters,
      query,
    );
    const where = {
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(`${from}T00:00:00+05:30`) } : {}),
              ...(to
                ? {
                    lt: new Date(
                      new Date(`${to}T00:00:00+05:30`).getTime() + 86400000,
                    ),
                  }
                : {}),
            },
          }
        : {}),
    };
    const pageSize = 25;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
          staff: { select: { id: true, name: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}

function recentCategoriesForRole(role: string) {
  if (role === "SUPER_ADMIN" || role === "ADMIN")
    return ["Storefront", "Sales", "Procurement", "Settings & team"];
  if (role === "SALES_MANAGER") return ["Storefront", "Sales"];
  if (role === "CATALOG_MANAGER" || role === "CONTENT_MANAGER")
    return ["Storefront"];
  if (role === "PROCUREMENT_HEAD") return ["Sales", "Procurement"];
  if (role === "DISPATCH_OFFICER") return ["Sales"];
  if (role === "ACCOUNTS_MANAGER") return ["Sales", "Settings & team"];
  return [];
}

const recentEntityTitles: Record<string, string> = {
  CATALOG_PRODUCT: "Catalogue product",
  PRODUCT_SKU: "Product variant",
  MEDIA_ASSET: "Storefront image",
  WEBSITE_CONTENT: "Website content",
  WEBSITE_BRANDS: "Brand directory",
  BLOG_POST: "Blog article",
  EXPERT_ADVISOR: "Expert or service listing",
  QUOTATION: "Quotation",
  RFQ: "Quote request",
  ORDER: "Order or delivery",
  PROCUREMENT_REQUEST: "Procurement request",
  PURCHASE_ORDER: "Purchase order",
  SUPPLIER: "Supplier",
  SUPPLIER_PRODUCT: "Supplier product",
  SUPPLIER_QUOTE: "Supplier quote",
  STAFF_ENQUIRY: "Customer enquiry",
  STAFF_USER: "Staff account",
  BUSINESS_RULES: "Business settings",
  DISCOUNT_RULE: "Discount rule",
  COMMISSION: "Commission settings",
  CUSTOMER_LOYALTY: "Customer loyalty account",
  LOYALTY_SETTINGS: "Loyalty settings",
};

const recentEntityCategories: Record<string, string> = {
  CATALOG_PRODUCT: "Storefront",
  PRODUCT_SKU: "Storefront",
  MEDIA_ASSET: "Storefront",
  WEBSITE_CONTENT: "Storefront",
  WEBSITE_BRANDS: "Storefront",
  BLOG_POST: "Storefront",
  EXPERT_ADVISOR: "Storefront",
  QUOTATION: "Sales",
  RFQ: "Sales",
  ORDER: "Sales",
  STAFF_ENQUIRY: "Sales",
  PROCUREMENT_REQUEST: "Procurement",
  PURCHASE_ORDER: "Procurement",
  SUPPLIER: "Procurement",
  SUPPLIER_PRODUCT: "Procurement",
  SUPPLIER_QUOTE: "Procurement",
  STAFF_USER: "Settings & team",
  BUSINESS_RULES: "Settings & team",
  DISCOUNT_RULE: "Settings & team",
  COMMISSION: "Settings & team",
  CUSTOMER_LOYALTY: "Settings & team",
  LOYALTY_SETTINGS: "Settings & team",
};

function describeRecentAction(action: string) {
  const labels: Record<string, string> = {
    WEBSITE_CONTENT_DRAFT_SAVED: "Draft saved",
    STAFF_ACCESS_UPDATED: "Access updated",
    STAFF_PASSWORD_RESET: "Password reset",
    RFQ_STATUS_UPDATED: "Status updated",
    ORDER_DELIVERY_COMPLETED: "Delivery completed",
    ORDER_PARTIALLY_DELIVERED: "Partially delivered",
  };
  if (labels[action]) return labels[action];
  const verb = action.match(
    /(?:^|_)(CREATED|RECEIVED|UPLOADED|PUBLISHED|UPDATED|EDITED|SAVED|ARCHIVED|DELETED|RESET|ADVANCED|ADJUSTED|COMPLETED|CHANGED)(?:_|$)/,
  )?.[1];
  const readableVerb: Record<string, string> = {
    CREATED: "Added",
    RECEIVED: "Received",
    UPLOADED: "Uploaded",
    PUBLISHED: "Published",
    UPDATED: "Edited",
    EDITED: "Edited",
    SAVED: "Saved",
    ARCHIVED: "Archived",
    DELETED: "Removed",
    RESET: "Reset",
    ADVANCED: "Advanced",
    ADJUSTED: "Adjusted",
    COMPLETED: "Completed",
    CHANGED: "Changed",
  };
  return readableVerb[verb || ""] || "Activity recorded";
}

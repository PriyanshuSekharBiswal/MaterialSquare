import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { StaffGuard } from "../auth/access.guard";
import { validate } from "../common/validation";
import { PrismaService } from "../prisma/prisma.service";

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
  async recent() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const entries = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: since },
        entityType: {
          in: [
            "CATALOG_PRODUCT",
            "PRODUCT_SKU",
            "MEDIA_ASSET",
            "WEBSITE_CONTENT",
            "WEBSITE_BRANDS",
            "BLOG_POST",
            "EXPERT_ADVISOR",
          ],
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        staff: { select: { name: true, role: true } },
      },
    });

    return {
      since: since.toISOString(),
      items: entries.map((entry) => {
        const metadata =
          entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata)
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
            : entry.entityType === "MEDIA_ASSET"
              ? "Storefront image"
              : entry.entityType === "WEBSITE_CONTENT"
                ? "Website content"
                : entry.entityType === "WEBSITE_BRANDS"
                  ? "Brand directory"
                  : entry.entityType === "BLOG_POST"
                    ? "Blog article"
                    : entry.entityType === "EXPERT_ADVISOR"
                      ? "Expert or service listing"
                      : "Catalogue product";

        return {
          id: entry.id,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          createdAt: entry.createdAt,
          title,
          changedFields: [...new Set(changedFields)].slice(0, 8),
          staff: entry.staff,
        };
      }),
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

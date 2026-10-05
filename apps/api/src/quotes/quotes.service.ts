import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { CreateQuoteInput } from "@material-square/types";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { demoAuthEnabled } from "../auth/demo-mode";
import { DEFAULT_BUSINESS_RULES } from "../business/settings/business-rules";
import {
  buildQuotationItems,
  calculateQuotationTotals,
} from "./quotation-pricing";
import { PrismaService } from "../prisma/prisma.service";
type DraftOperation =
  { kind: "new" } | { kind: "revision" | "edit"; id: string };

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}
  findAll() {
    return this.prisma.quotation.findMany({
      include: {
        items: { include: { product: true, options: true } },
        followups: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async findById(id: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id },
      include: { items: { include: { product: true, options: true } } },
    });
    if (!quote) throw new NotFoundException("Quotation not found");
    return quote;
  }
  create(input: CreateQuoteInput, staffId?: string) {
    return this.saveDraft(input, { kind: "new" }, staffId);
  }

  revise(id: string, input: CreateQuoteInput, staffId?: string) {
    return this.saveDraft(input, { kind: "revision", id }, staffId);
  }

  editDraft(id: string, input: CreateQuoteInput, staffId?: string) {
    return this.saveDraft(input, { kind: "edit", id }, staffId);
  }

  private async saveDraft(
    input: CreateQuoteInput,
    operation: DraftOperation,
    staffId?: string,
  ) {
    const revisedFromId =
      operation.kind === "revision" ? operation.id : undefined;
    const editId = operation.kind === "edit" ? operation.id : undefined;
    const selections = input.items.flatMap((line) => [
      line,
      ...line.alternatives,
    ]);
    const ids = [
      ...new Set(
        selections.flatMap((item) => (item.productId ? [item.productId] : [])),
      ),
    ];
    const products = await this.prisma.productSKU.findMany({
      where: { id: { in: ids } },
      include: { brand: true },
    });
    if (products.length !== ids.length)
      throw new BadRequestException("One or more products do not exist");
    const catalogueIds = [
      ...new Set(
        selections.flatMap((line) =>
          line.catalogueId ? [line.catalogueId] : [],
        ),
      ),
    ];
    const catalogue = await this.prisma.catalogListing.findMany({
      where: { id: { in: catalogueIds } },
      include: { variants: true },
    });
    if (catalogue.length !== catalogueIds.length)
      throw new BadRequestException(
        "One or more catalogue listings do not exist",
      );
    const items = buildQuotationItems(input, products, catalogue);
    const customer = await this.prisma.customer.upsert({
      where: { phone: input.customerPhone },
      create: {
        phone: input.customerPhone,
        name: input.customerName,
        isDemo: demoAuthEnabled(),
        email: input.customerEmail,
        shippingAddress: input.projectSiteAddress,
        pincode: input.sitePincode,
      },
      update: {},
      select: { id: true },
    });
    const now = new Date();
    const rules = await this.prisma.discountRule.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });
    const { items: pricedItems, ...totals } = calculateQuotationTotals(
      items,
      rules,
      input,
    );
    const itemCreates = pricedItems.map(({ options, ...item }) => ({
      ...item,
      options: { create: options },
    }));
    const businessRules =
      (await this.prisma.businessRuleSetting.findUnique({
        where: { id: "global" },
      })) ?? DEFAULT_BUSINESS_RULES;
    return this.prisma
      .$transaction(async (db) => {
        const source = revisedFromId
          ? await db.quotation.findUnique({ where: { id: revisedFromId } })
          : null;
        if (revisedFromId) {
          if (!source)
            throw new NotFoundException("Original quotation not found");
          if (!["QUOTE_SENT", "EXPIRED", "REJECTED"].includes(source.status))
            throw new ConflictException(
              "Only published, expired or declined quotations can be revised",
            );
          if (source.customerPhone !== input.customerPhone)
            throw new BadRequestException(
              "A revision must remain with the original customer",
            );
          if (await db.quotation.count({ where: { revisedFromId } }))
            throw new ConflictException(
              "A revision already exists; continue from the latest quotation",
            );
        }
        const data = {
          customerId: customer.id,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail ?? null,
          projectSiteAddress: input.projectSiteAddress,
          sitePincode: input.sitePincode,
          drawingFileUrl: input.drawingFileUrl ?? null,
          notes: input.notes ?? null,
          status: "DRAFT" as const,
          ...totals,
          marginPct: 0,
          taxPct: input.taxPct,
          marginAmount: 0,
          freightAmount: input.freightAmount,
          validUntil: new Date(
            Date.now() + businessRules.quotationValidityHours * 3600000,
          ),
        };
        if (editId) {
          const existing = await db.quotation.findUnique({
            where: { id: editId },
          });
          if (!existing) throw new NotFoundException("Quotation not found");
          if (
            !["DRAFT", "PENDING_REVIEW", "MARGIN_ADJUSTED"].includes(
              existing.status,
            )
          )
            throw new ConflictException(
              "Only unpublished drafts can be edited",
            );
          if (existing.customerPhone !== input.customerPhone)
            throw new BadRequestException(
              "The original customer cannot be changed",
            );
          const saved = await db.quotation.update({
            where: {
              id: editId,
              updatedAt: existing.updatedAt,
              status: { in: ["DRAFT", "PENDING_REVIEW", "MARGIN_ADJUSTED"] },
            },
            data: {
              ...data,
              items: { deleteMany: {}, create: itemCreates },
            },
            include: { items: { include: { product: true, options: true } } },
          });
          await db.auditLog.create({
            data: {
              staffId,
              action: "QUOTATION_DRAFT_EDITED",
              entityType: "QUOTATION",
              entityId: saved.id,
              metadata: {
                quoteNumber: saved.quoteNumber,
                lineCount: items.length,
                comparisonOptionCount: items.reduce(
                  (count, item) => count + item.options.length,
                  0,
                ),
              },
            },
          });
          return saved;
        }
        const saved = await db.quotation.create({
          data: {
            ...data,
            revisedFromId,
            revisionNumber: source ? source.revisionNumber + 1 : 1,
            quoteNumber: `MS-QT-${new Date().getFullYear()}-${randomUUID()}`,
            items: { create: itemCreates },
          },
          include: { items: { include: { product: true, options: true } } },
        });
        await db.auditLog.create({
          data: {
            staffId,
            action: revisedFromId
              ? "QUOTATION_REVISION_CREATED"
              : "QUOTATION_CREATED",
            entityType: "QUOTATION",
            entityId: saved.id,
            metadata: {
              quoteNumber: saved.quoteNumber,
              revisionNumber: saved.revisionNumber,
              revisedFromId: revisedFromId || null,
              lineCount: items.length,
              comparisonOptionCount: items.reduce(
                (count, item) => count + item.options.length,
                0,
              ),
            },
          },
        });
        return saved;
      })
      .catch((error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025" &&
          editId
        )
          throw new ConflictException(
            "The draft changed; refresh before editing",
          );
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          revisedFromId
        )
          throw new ConflictException(
            "A revision already exists; continue from the latest quotation",
          );
        throw error;
      });
  }
  async publish(id: string, staffId?: string) {
    return this.prisma.$transaction(async (db) => {
      const quote = await db.quotation.findUnique({ where: { id } });
      if (!quote) throw new NotFoundException("Quotation not found");
      if (await db.quotation.count({ where: { revisedFromId: id } }))
        throw new ConflictException("Publish the latest revision instead");
      if (quote.revisedFromId) {
        const superseded = await db.quotation.updateMany({
          where: {
            id: quote.revisedFromId,
            status: { in: ["QUOTE_SENT", "EXPIRED", "REJECTED"] },
          },
          data: { status: "EXPIRED", validUntil: new Date() },
        });
        if (superseded.count !== 1)
          throw new ConflictException(
            "The original quotation was accepted; this revision cannot be published",
          );
      }
      const updated = await db.quotation.updateMany({
        where: {
          id,
          status: { in: ["DRAFT", "PENDING_REVIEW", "MARGIN_ADJUSTED"] },
          validUntil: { gt: new Date() },
        },
        data: { status: "QUOTE_SENT" },
      });
      if (updated.count !== 1)
        throw new BadRequestException(
          "Only current draft quotations can be published",
        );
      const businessRules =
        (await db.businessRuleSetting.findUnique({
          where: { id: "global" },
        })) ?? DEFAULT_BUSINESS_RULES;
      if (businessRules.sendQuotePublishedNotification)
        await db.notificationOutbox.create({
          data: {
            type: "quote-published",
            payload: { quoteId: id, phone: quote.customerPhone },
          },
        });
      if (businessRules.sendQuoteExpiryReminder)
        await db.notificationOutbox.create({
          data: {
            type: "quote-expiry-reminder",
            payload: { quoteId: id, phone: quote.customerPhone },
            runAt: new Date(
              Math.max(
                Date.now(),
                quote.validUntil.getTime() -
                  businessRules.expiryReminderHoursBefore * 3600000,
              ),
            ),
          },
        });
      await db.auditLog.create({
        data: {
          staffId,
          action: "QUOTATION_PUBLISHED",
          entityType: "QUOTATION",
          entityId: id,
          metadata: {
            quoteNumber: quote.quoteNumber,
            revisionNumber: quote.revisionNumber,
          },
        },
      });
      return db.quotation.findUnique({ where: { id } });
    });
  }
  async adjustMargin(id: string, marginPct: number, staffId?: string) {
    const quote = await this.findById(id);
    if (!["DRAFT", "PENDING_REVIEW", "MARGIN_ADJUSTED"].includes(quote.status))
      throw new BadRequestException("Only draft quotations can be adjusted");
    const taxRate = quote.taxPct.div(100);
    const marginAmount = quote.subtotal
      .sub(quote.discountAmount)
      .mul(marginPct)
      .div(100)
      .toDecimalPlaces(2);
    const taxAmount = quote.subtotal
      .add(marginAmount)
      .sub(quote.discountAmount)
      .mul(taxRate)
      .toDecimalPlaces(2);
    return this.prisma.$transaction(async (db) => {
      const changed = await db.quotation.updateMany({
        where: {
          id,
          status: { in: ["DRAFT", "PENDING_REVIEW", "MARGIN_ADJUSTED"] },
          updatedAt: quote.updatedAt,
        },
        data: {
          marginPct,
          marginAmount,
          taxAmount,
          totalAmount: quote.subtotal
            .add(marginAmount)
            .sub(quote.discountAmount)
            .add(taxAmount)
            .add(quote.freightAmount),
          status: "MARGIN_ADJUSTED",
        },
      });
      if (changed.count !== 1)
        throw new ConflictException(
          "The quotation changed; refresh before adjusting it",
        );
      await db.auditLog.create({
        data: {
          staffId,
          action: "QUOTATION_MARGIN_ADJUSTED",
          entityType: "QUOTATION",
          entityId: id,
          metadata: {
            marginPct,
            previousMarginAmount: quote.marginAmount.toString(),
            marginAmount: marginAmount.toString(),
          },
        },
      });
      return db.quotation.findUniqueOrThrow({
        where: { id },
        include: { items: { include: { product: true, options: true } } },
      });
    });
  }
}

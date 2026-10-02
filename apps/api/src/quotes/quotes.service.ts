import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { CreateQuoteInput } from "@material-square/types";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { demoAuthEnabled } from "../auth/demo-mode";
import { PrismaService } from "../prisma/prisma.service";
@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}
  findAll() {
    return this.prisma.quotation.findMany({
      include: { items: { include: { product: true } }, followups: true },
      orderBy: { createdAt: "desc" },
    });
  }
  async findById(id: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!quote) throw new NotFoundException("Quotation not found");
    return quote;
  }
  async create(input: CreateQuoteInput) {
    const ids = [...new Set(input.items.map((i) => i.productId))];
    const products = await this.prisma.productSKU.findMany({
      where: { id: { in: ids } },
      select: { id: true, category: true },
    });
    if (products.length !== ids.length)
      throw new BadRequestException("One or more products do not exist");
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
    const items = input.items.map((i) => ({
      ...i,
      lineTotal: new Prisma.Decimal(i.quantityMt)
        .mul(i.unitPrice)
        .toDecimalPlaces(2),
    }));
    const subtotal = items.reduce(
      (sum, i) => sum.add(i.lineTotal),
      new Prisma.Decimal(0),
    );
    const categories = new Map(products.map((product) => [product.id, product.category]));
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
    const discountAmount = items.reduce((total, item) => {
      const category = categories.get(item.productId);
      const rule = rules.find((candidate) => {
        const quantity = item.quantityMt;
        return (
          (!candidate.category || candidate.category === category) &&
          (!candidate.deliveryPincodes.length ||
            candidate.deliveryPincodes.includes(input.sitePincode)) &&
          (!candidate.minimumQuantity ||
            quantity >= candidate.minimumQuantity.toNumber()) &&
          (!candidate.maximumQuantity ||
            quantity <= candidate.maximumQuantity.toNumber())
        );
      });
      if (!rule) return total;
      const rawDiscount = item.lineTotal
        .mul(rule.percentageOff)
        .div(100)
        .add(rule.fixedAmountOff);
      return total.add(Prisma.Decimal.min(item.lineTotal, rawDiscount).toDecimalPlaces(2));
    }, new Prisma.Decimal(0));
    const taxableSubtotal = subtotal.sub(discountAmount);
    const taxAmount = taxableSubtotal
      .mul(input.taxPct)
      .div(100)
      .toDecimalPlaces(2);
    return this.prisma.quotation.create({
      data: {
        quoteNumber: `MS-QT-${new Date().getFullYear()}-${randomUUID()}`,
        customerId: customer.id,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        projectSiteAddress: input.projectSiteAddress,
        sitePincode: input.sitePincode,
        drawingFileUrl: input.drawingFileUrl,
        notes: input.notes,
        status: "DRAFT",
        subtotal,
        marginAmount: 0,
        discountAmount,
        taxAmount,
        freightAmount: input.freightAmount,
        totalAmount: taxableSubtotal.add(taxAmount).add(input.freightAmount),
        validUntil: new Date(Date.now() + 48 * 3600000),
        items: { create: items },
      },
      include: { items: { include: { product: true } } },
    });
  }
  async publish(id: string) {
    return this.prisma.$transaction(async (db) => {
      const quote = await db.quotation.findUnique({ where: { id } });
      if (!quote) throw new NotFoundException("Quotation not found");
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
      await db.notificationOutbox.create({
        data: {
          type: "quote-published",
          payload: { quoteId: id, phone: quote.customerPhone },
        },
      });
      await db.notificationOutbox.create({
        data: {
          type: "quote-expiry-reminder",
          payload: { quoteId: id, phone: quote.customerPhone },
          runAt: new Date(
            Math.max(Date.now(), quote.validUntil.getTime() - 24 * 3600000),
          ),
        },
      });
      return db.quotation.findUnique({ where: { id } });
    });
  }
  async adjustMargin(id: string, marginPct: number) {
    const quote = await this.findById(id);
    if (!["DRAFT", "PENDING_REVIEW", "MARGIN_ADJUSTED"].includes(quote.status))
      throw new BadRequestException("Only draft quotations can be adjusted");
    const oldTaxBase = quote.subtotal
      .add(quote.marginAmount)
      .sub(quote.discountAmount);
    const taxRate = oldTaxBase.isZero()
      ? new Prisma.Decimal(0)
      : quote.taxAmount.div(oldTaxBase);
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
    return this.prisma.quotation.update({
      where: { id },
      data: {
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
  }
}

import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { StaffGuard } from "../../auth/access.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { validate } from "../../common/validation";
import type { StaffRequest } from "../../auth/staff-request";
import {
  procurementItem,
  procurementInput,
  supplierQuoteInput,
} from "../business.schemas";
import {
  createBusinessReferenceNumber,
  createProcurementRequestNumber,
} from "./procurement-number";
import { loadMatchingSuppliers, matchSupplierCatalogue } from "./supplier-matching";

@Controller("procurement")
@UseGuards(StaffGuard)
export class ProcurementController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.procurementRequest.findMany({
      include: {
        supplierQuotes: {
          include: { supplier: true, purchaseOrder: true },
          orderBy: { totalAmount: "asc" },
        },
        purchaseOrders: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  @Post()
  create(@Req() req: StaffRequest, @Body() body: unknown) {
    const data = validate(procurementInput, body);
    return this.prisma.$transaction(async (db) => {
      const request = await db.procurementRequest.create({
        data: {
          ...data,
          requiredBy: data.requiredBy ? new Date(data.requiredBy) : undefined,
          requestNumber: await createProcurementRequestNumber(db),
          createdById: req.user.userId,
        },
      });
      await db.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "PROCUREMENT_REQUEST_CREATED",
          entityType: "PROCUREMENT_REQUEST",
          entityId: request.id,
          metadata: {
            requestNumber: request.requestNumber,
            orderId: request.orderId,
            itemCount: data.items.length,
          },
        },
      });
      return request;
    });
  }

  @Get(":id/suppliers")
  async candidates(@Param("id") id: string) {
    const request = await this.prisma.procurementRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException("Procurement request not found");
    const items = z.array(procurementItem).parse(request.items);
    return matchSupplierCatalogue(this.prisma, { ...request, items });
  }

  @Get("customer-rfqs")
  async customerRfqs() {
    const requests = await this.prisma.rfq.findMany({
      where: { status: { in: ["NEW", "CONTACTED", "QUOTED"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, requestNumber: true, siteLocation: true, items: true, status: true, createdAt: true },
    });
    const suppliers = requests.length ? await loadMatchingSuppliers(this.prisma) : [];
    return Promise.all(requests.map(async (request) => {
      const location = request.siteLocation.match(/,\s*(.*?)\s+([1-9]\d{5})$/);
      const items = z.array(z.object({
        material: z.string(), brand: z.string().optional(), category: z.string().optional(),
        quantity: z.number(), unit: z.string(), specification: z.string().optional(),
        variantId: z.string().nullable().optional(),
      })).safeParse(request.items);
      const matchSummary = location && items.success
        ? await matchSupplierCatalogue(this.prisma, {
            deliveryCity: location[1], deliveryPincode: location[2],
            items: items.data.map((item) => ({
              productName: item.material, brand: item.brand, category: item.category,
              unit: item.unit, quantity: item.quantity, notes: item.specification,
              catalogVariantId: item.variantId,
            })),
          }, suppliers)
        : null;
      return {
        ...request,
        deliveryCity: location?.[1] || "",
        deliveryPincode: location?.[2] || "",
        locationParsed: Boolean(location),
        items: items.success ? items.data : [],
        matchSummary: matchSummary ? {
          matchedSupplierCount: matchSummary.candidates.length,
          requestedItems: matchSummary.requestedItems,
        } : null,
      };
    }));
  }

  @Get("customer-rfqs/:id/suppliers")
  async customerRfqCandidates(@Param("id") id: string) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id }, select: { id: true, siteLocation: true, items: true } });
    if (!rfq) throw new NotFoundException("Customer request not found");
    const location = rfq.siteLocation.match(/,\s*(.*?)\s+([1-9]\d{5})$/);
    const parsedItems = z.array(z.object({
      material: z.string(), brand: z.string().optional(), category: z.string().optional(),
      quantity: z.number().positive(), unit: z.string(), specification: z.string().optional(),
      variantId: z.string().nullable().optional(),
    })).safeParse(rfq.items);
    if (!location || !parsedItems.success)
      throw new BadRequestException("This request is missing a usable delivery PIN or product details");
    return matchSupplierCatalogue(this.prisma, {
      deliveryCity: location[1], deliveryPincode: location[2],
      items: parsedItems.data.map((item) => ({
        productName: item.material, brand: item.brand, category: item.category,
        quantity: item.quantity, unit: item.unit, notes: item.specification,
        catalogVariantId: item.variantId,
      })),
    });
  }

  @Post(":id/quotes")
  async addSupplierQuote(
    @Param("id") id: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ) {
    const request = await this.prisma.procurementRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException("Procurement request not found");
    const data = validate(supplierQuoteInput, body);
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: data.supplierId },
    });
    if (!supplier || supplier.status !== "ACTIVE")
      throw new BadRequestException("Choose an active registered supplier");
    const requested = z.array(procurementItem).parse(request.items);
    const lineKeys = new Set<string>();
    const quoteTotal = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    if (Math.abs(quoteTotal - data.totalAmount) > 0.01)
      throw new BadRequestException(
        "Supplier total must match the item quantities and unit prices",
      );
    for (const item of data.items) {
      const key = `${item.productName.toLowerCase()}|${(item.brand || "").toLowerCase()}|${item.unit.toLowerCase()}`;
      if (lineKeys.has(key))
        throw new BadRequestException(
          "Each requested material can appear only once in a supplier quote",
        );
      lineKeys.add(key);
      const requestedItem = requested.find(
        (candidate) =>
          candidate.productName.toLowerCase() ===
            item.productName.toLowerCase() &&
          (candidate.brand || "").toLowerCase() ===
            (item.brand || "").toLowerCase() &&
          candidate.unit.toLowerCase() === item.unit.toLowerCase(),
      );
      if (!requestedItem || item.quantity > requestedItem.quantity)
        throw new BadRequestException(
          `Quoted quantity for ${item.productName} exceeds or does not match the request`,
        );
    }
    return this.prisma.$transaction(async (db) => {
      const existingQuote = await db.supplierQuote.findUnique({
        where: {
          requestId_supplierId: { requestId: id, supplierId: supplier.id },
        },
        include: { purchaseOrder: true },
      });
      if (existingQuote?.purchaseOrder)
        throw new ConflictException(
          "This supplier quote already has a purchase order and can no longer be changed",
        );
      const supplierQuote = await db.supplierQuote.upsert({
        where: {
          requestId_supplierId: { requestId: id, supplierId: supplier.id },
        },
        create: {
          requestId: id,
          supplierQuoteNumber:
            existingQuote?.supplierQuoteNumber ??
            (await createBusinessReferenceNumber(db, "SQ")),
          supplierId: supplier.id,
          items: data.items,
          totalAmount: data.totalAmount,
          leadTimeDays: data.leadTimeDays,
          available: data.available,
          validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
          notes: data.notes,
        },
        update: {
          items: data.items,
          totalAmount: data.totalAmount,
          leadTimeDays: data.leadTimeDays,
          available: data.available,
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          notes: data.notes,
          status: "RECEIVED",
        },
      });
      await db.procurementRequest.update({
        where: { id },
        data: { status: "COMPARING" },
      });
      await db.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: existingQuote
            ? "SUPPLIER_QUOTE_UPDATED"
            : "SUPPLIER_QUOTE_RECEIVED",
          entityType: "SUPPLIER_QUOTE",
          entityId: supplierQuote.id,
          metadata: {
            requestId: id,
            supplierId: supplier.id,
            itemCount: data.items.length,
            totalAmount: data.totalAmount,
          },
        },
      });
      return supplierQuote;
    });
  }
}

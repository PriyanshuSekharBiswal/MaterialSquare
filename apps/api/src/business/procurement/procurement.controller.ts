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
import { randomUUID } from "node:crypto";
import { StaffGuard } from "../../auth/access.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { validate } from "../../common/validation";
import type { StaffRequest } from "../../auth/staff-request";
import {
  procurementItem,
  procurementInput,
  supplierQuoteInput,
} from "../business.schemas";

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
          requestNumber: `MS-PR-${new Date().getFullYear()}-${randomUUID()}`,
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
    const suppliers = await this.prisma.supplier.findMany({
      where: { status: "ACTIVE" },
      include: { products: { where: { isActive: true } }, ratings: true },
    });
    const candidates = suppliers
      .map((supplier) => {
        const matchedItems = items.filter((item) =>
          supplier.products.some(
            (product) =>
              product.productName.toLowerCase() ===
                item.productName.toLowerCase() &&
              (!item.brand ||
                product.brand.toLowerCase() === item.brand.toLowerCase()),
          ),
        );
        const serviceAreaMatch =
          supplier.pincode === request.deliveryPincode ||
          supplier.servicePincodes.includes(request.deliveryPincode);
        const cityMatch =
          supplier.city.trim().toLowerCase() ===
          request.deliveryCity.trim().toLowerCase();
        const scores = supplier.ratings.flatMap((rating) => [
          rating.priceScore,
          rating.deliveryScore,
          rating.availabilityScore,
          rating.qualityScore,
          rating.serviceScore,
        ]);
        return {
          ...supplier,
          matchedItems: matchedItems.map((item) => item.productName),
          serviceAreaMatch,
          cityMatch,
          averageScore: scores.length
            ? scores.reduce((sum, value) => sum + value, 0) / scores.length
            : null,
        };
      })
      .filter((supplier) => supplier.matchedItems.length > 0)
      .sort(
        (a, b) =>
          Number(b.serviceAreaMatch) - Number(a.serviceAreaMatch) ||
          Number(b.cityMatch) - Number(a.cityMatch) ||
          (b.averageScore || 0) - (a.averageScore || 0),
      );
    return { deliveryPincode: request.deliveryPincode, candidates };
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

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
    const suppliers = await this.prisma.supplier.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      include: {
        products: {
          where: { isActive: true, deletedAt: null },
          include: { catalogVariant: { include: { listing: true } } },
        },
        ratings: true,
      },
    });
    const candidates = suppliers
      .map((supplier) => {
        const matchedProducts = items.flatMap((item) => {
          const product = supplier.products.find(
            (candidate) => {
              if (
                item.catalogVariantId &&
                candidate.catalogVariantId === item.catalogVariantId
              )
                return true;

              const sameProduct =
                candidate.productName.trim().toLowerCase() ===
                  item.productName.trim().toLowerCase() &&
                candidate.brand.trim().toLowerCase() ===
                  (item.brand || "").trim().toLowerCase() &&
                (!item.category ||
                  candidate.category.trim().toLowerCase() ===
                    item.category.trim().toLowerCase()) &&
                (!item.unit ||
                  candidate.unit.trim().toLowerCase() ===
                    item.unit.trim().toLowerCase());
              if (!sameProduct) return false;

              if (!item.catalogVariantId || !candidate.catalogVariantId)
                return true;

              // Different catalogue records can represent the same sellable
              // variant. Only treat them as equivalent when the identifying
              // listing fields and every pack/spec attribute also agree.
              const requestedNotes = (item.notes || "").toLowerCase();
              const supplierVariant = candidate.catalogVariant;
              if (!supplierVariant || !requestedNotes) return false;
              const attributes = supplierVariant.attributes;
              const attributeValues =
                attributes && typeof attributes === "object"
                  ? Object.values(attributes as Record<string, unknown>)
                      .filter((value): value is string | number =>
                        typeof value === "string" || typeof value === "number",
                      )
                      .map((value) => String(value).trim().toLowerCase())
                      .filter(Boolean)
                  : [];
              const label = supplierVariant.label.trim().toLowerCase();
              const variantDetails = [...new Set([label, ...attributeValues])];
              return (
                supplierVariant.listing.name.trim().toLowerCase() ===
                  item.productName.trim().toLowerCase() &&
                supplierVariant.listing.brand.trim().toLowerCase() ===
                  (item.brand || "").trim().toLowerCase() &&
                supplierVariant.unit.trim().toLowerCase() ===
                  item.unit.trim().toLowerCase() &&
                variantDetails.length > 0 &&
                variantDetails.every((detail) => requestedNotes.includes(detail))
              );
            },
          );
          return product ? [{ ...product, requestedQuantity: item.quantity }] : [];
        });
        const deliveryPincodeMatch =
          supplier.pincode === request.deliveryPincode;
        const serviceCoverageMatch = supplier.servicePincodes.includes(
          request.deliveryPincode,
        );
        const cityMatch =
          supplier.city.trim().toLowerCase() ===
          request.deliveryCity.trim().toLowerCase();
        const stateMatch = Boolean(
          request.deliveryState &&
            supplier.state.trim().toLowerCase() ===
              request.deliveryState.trim().toLowerCase(),
        );
        const locationMatchPercent = deliveryPincodeMatch
          ? 100
          : serviceCoverageMatch
            ? 80
            : cityMatch
              ? 60
              : stateMatch
                ? 40
                : 0;
        const locationMatchLabel = deliveryPincodeMatch
          ? "Exact PIN"
          : serviceCoverageMatch
            ? "Service PIN"
            : cityMatch
              ? "Same city"
              : stateMatch
                ? "Same state"
                : "Other location";
        const scores = supplier.ratings.flatMap((rating) => [
          rating.priceScore,
          rating.deliveryScore,
          rating.availabilityScore,
          rating.qualityScore,
          rating.serviceScore,
        ]);
        return {
          ...supplier,
          matchedItems: matchedProducts.map((product) => product.productName),
          matchedProducts,
          deliveryPincodeMatch,
          serviceCoverageMatch,
          serviceAreaMatch: deliveryPincodeMatch || serviceCoverageMatch,
          cityMatch,
          stateMatch,
          locationMatchPercent,
          locationMatchLabel,
          averageScore: scores.length
            ? scores.reduce((sum, value) => sum + value, 0) / scores.length
            : null,
        };
      })
      .filter((supplier) => supplier.matchedProducts.length > 0)
      .sort(
        (a, b) =>
          b.locationMatchPercent - a.locationMatchPercent ||
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

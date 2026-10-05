import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { StaffGuard } from "../../auth/access.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { PdfService } from "../../pdf/pdf.service";
import { validate } from "../../common/validation";
import type { Response } from "express";
import type { StaffRequest } from "../../auth/staff-request";
import {
  procurementItem,
  purchaseOrderInput,
  supplierQuoteItem,
} from "../business.schemas";

@Controller("purchase-orders")
@UseGuards(StaffGuard)
export class PurchaseOrdersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: PdfService,
  ) {}

  @Get()
  list() {
    return this.prisma.purchaseOrder.findMany({
      include: { supplier: true, request: true, supplierQuote: true },
      orderBy: { createdAt: "desc" },
    });
  }

  @Get(":id/pdf")
  async pdfDocument(@Param("id") id: string, @Res() res: Response) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true },
    });
    if (!po) throw new NotFoundException("Purchase order not found");
    const buffer = await this.pdf.generatePurchaseOrderPdf(po);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${po.purchaseOrderNumber}.pdf"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: StaffRequest) {
    const data = validate(purchaseOrderInput, body);
    const quote = await this.prisma.supplierQuote.findUnique({
      where: { id: data.supplierQuoteId },
      include: { request: true, supplier: true, purchaseOrder: true },
    });
    if (!quote || !quote.available)
      throw new NotFoundException("Available supplier quote not found");
    if (quote.validUntil && quote.validUntil <= new Date())
      throw new ConflictException(
        "The supplier quote has expired; obtain a current quote before creating a purchase order",
      );
    if (quote.supplier.status !== "ACTIVE")
      throw new ConflictException("The supplier is no longer active");
    if (quote.purchaseOrder)
      throw new ConflictException(
        "A purchase order already exists for this supplier quote",
      );
    const subtotal = quote.totalAmount;
    const totalAmount = subtotal.add(data.taxAmount).add(data.freightAmount);
    const requestedItems = z.array(procurementItem).parse(quote.request.items);
    // Quotes created before line-level pricing retain their original whole-request PO behavior.
    const quotedItems =
      Array.isArray(quote.items) && quote.items.length
        ? z.array(supplierQuoteItem).parse(quote.items)
        : requestedItems;
    const allocationKey = (item: {
      productName: string;
      brand?: string;
      unit: string;
    }) =>
      `${item.productName.toLowerCase()}|${(item.brand || "").toLowerCase()}|${item.unit.toLowerCase()}`;
    const created = await this.prisma.$transaction(
      async (tx) => {
        const existingOrders = await tx.purchaseOrder.findMany({
          where: { requestId: quote.requestId },
          select: { items: true },
        });
        const allocated = new Map<string, number>();
        for (const order of existingOrders) {
          const lines = z.array(procurementItem).safeParse(order.items);
          if (!lines.success) continue;
          for (const line of lines.data) {
            const key = allocationKey(line);
            allocated.set(key, (allocated.get(key) || 0) + line.quantity);
          }
        }
        const requestedByKey = new Map(
          requestedItems.map((item) => [allocationKey(item), item]),
        );
        for (const item of quotedItems) {
          const requested = requestedByKey.get(allocationKey(item));
          if (
            !requested ||
            (allocated.get(allocationKey(item)) || 0) + item.quantity >
              requested.quantity + 1e-8
          )
            throw new ConflictException(
              `The ${item.productName} allocation exceeds the remaining requested quantity`,
            );
        }
        const po = await tx.purchaseOrder.create({
          data: {
            purchaseOrderNumber: `MS-PO-${new Date().getFullYear()}-${randomUUID()}`,
            requestId: quote.requestId,
            supplierId: quote.supplierId,
            supplierQuoteId: quote.id,
            shippingAddress: data.shippingAddress,
            shippingContact: data.shippingContact,
            items: quotedItems as unknown as Prisma.InputJsonValue,
            subtotal,
            taxAmount: data.taxAmount,
            freightAmount: data.freightAmount,
            totalAmount,
            notes: data.notes,
          },
          include: { supplier: true, request: true, supplierQuote: true },
        });
        await tx.supplierQuote.update({
          where: { id: quote.id },
          data: { status: "SELECTED" },
        });
        await tx.procurementRequest.update({
          where: { id: quote.requestId },
          data: { status: "APPROVAL_PENDING" },
        });
        await tx.auditLog.create({
          data: {
            staffId: req.user.userId,
            action: "PURCHASE_ORDER_CREATED",
            entityType: "PURCHASE_ORDER",
            entityId: po.id,
            metadata: {
              purchaseOrderNumber: po.purchaseOrderNumber,
              supplierQuoteId: quote.id,
              totalAmount: po.totalAmount.toString(),
            },
          },
        });
        return po;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return created;
  }

  @Post(":id/approve")
  async approve(@Param("id") id: string, @Req() req: StaffRequest) {
    if (!["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"].includes(req.user.role))
      throw new ForbiddenException(
        "A procurement approver must authorize this order",
      );
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException("Purchase order not found");
    if (po.status !== "PENDING_APPROVAL" && po.status !== "DRAFT")
      throw new ConflictException(
        "This purchase order cannot be approved in its current state",
      );
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.purchaseOrder.updateMany({
        where: {
          id,
          updatedAt: po.updatedAt,
          status: { in: ["PENDING_APPROVAL", "DRAFT"] },
        },
        data: {
          status: "APPROVED",
          approvedById: req.user.userId,
          approvedAt: new Date(),
        },
      });
      if (!result.count)
        throw new ConflictException(
          "Purchase order state changed; refresh and try again",
        );
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "PURCHASE_ORDER_APPROVED",
          entityType: "PURCHASE_ORDER",
          entityId: id,
          metadata: {
            revisionNumber: po.revisionNumber,
            purchaseOrderNumber: po.purchaseOrderNumber,
          },
        },
      });
      return tx.purchaseOrder.findUnique({ where: { id } });
    });
  }

  @Post(":id/send")
  async send(@Param("id") id: string, @Req() req: StaffRequest) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true },
    });
    if (!po) throw new NotFoundException("Purchase order not found");
    if (po.status !== "APPROVED")
      throw new ConflictException(
        "Approve the purchase order before sending it",
      );
    const document = await this.pdf.generatePurchaseOrderPdf(po);
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.purchaseOrder.updateMany({
        where: { id, updatedAt: po.updatedAt, status: "APPROVED" },
        data: { status: "SENT", sentAt: new Date() },
      });
      if (!changed.count)
        throw new ConflictException(
          "Purchase order was already sent or changed",
        );
      await tx.notificationOutbox.create({
        data: {
          type: "purchase-order-sent",
          payload: {
            purchaseOrderId: po.id,
            purchaseOrderNumber: po.purchaseOrderNumber,
            revisionNumber: po.revisionNumber,
            supplierEmail: po.supplier.email,
            supplierPhone: po.supplier.phone,
            attachment: {
              fileName: `${po.purchaseOrderNumber}.pdf`,
              contentType: "application/pdf",
              contentBase64: document.toString("base64"),
            },
          },
        },
      });
      const request = await tx.procurementRequest.findUnique({
        where: { id: po.requestId },
      });
      const allOrders = await tx.purchaseOrder.findMany({
        where: {
          requestId: po.requestId,
          OR: [{ id }, { status: "SENT" }],
        },
        select: { items: true },
      });
      const required = request
        ? z.array(procurementItem).parse(request.items)
        : [];
      const delivered = new Map<string, number>();
      for (const order of allOrders) {
        const lines = z.array(procurementItem).safeParse(order.items);
        if (!lines.success) continue;
        for (const line of lines.data) {
          const key = `${line.productName.toLowerCase()}|${(line.brand || "").toLowerCase()}|${line.unit.toLowerCase()}`;
          delivered.set(key, (delivered.get(key) || 0) + line.quantity);
        }
      }
      const fullyAllocated = required.every((item) => {
        const key = `${item.productName.toLowerCase()}|${(item.brand || "").toLowerCase()}|${item.unit.toLowerCase()}`;
        return (delivered.get(key) || 0) >= item.quantity;
      });
      await tx.procurementRequest.update({
        where: { id: po.requestId },
        data: { status: fullyAllocated ? "ORDERED" : "COMPARING" },
      });
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "PURCHASE_ORDER_SEND_QUEUED",
          entityType: "PURCHASE_ORDER",
          entityId: id,
          metadata: {
            revisionNumber: po.revisionNumber,
            purchaseOrderNumber: po.purchaseOrderNumber,
          },
        },
      });
      return tx.purchaseOrder.findUnique({ where: { id } });
    });
  }
}

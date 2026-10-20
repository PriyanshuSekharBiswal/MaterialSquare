import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PdfService } from "../pdf/pdf.service";
import { creditDeliveredOrderLoyalty } from "./order-loyalty";
import { Prisma } from "@prisma/client";
import { createBusinessReferenceNumber } from "../business/procurement/procurement-number";
import { paginatedResult, type Pagination } from "../common/pagination";
@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
  ) {}
  async findAll(includeFinancialDetails = true, pagination?: Pagination) {
    const orders = await this.prisma.order.findMany({
      ...(pagination
        ? { skip: pagination.skip, take: pagination.pageSize + 1 }
        : {}),
      include: {
        dispatch: true,
        quotation: {
          select: {
            id: true,
            quoteNumber: true,
            requestId: true,
            request: { select: { requestNumber: true } },
          },
        },
        manualPaymentRecordedBy: { select: { name: true } },
        payments: { include: { recordedBy: { select: { name: true } } }, orderBy: { recordedAt: "asc" } },
        items: { include: { product: true, deliveries: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    const page = pagination ? paginatedResult(orders, pagination) : null;
    const rows = page ? page.items : orders;
    const safeRows = includeFinancialDetails
      ? rows
      : rows.map((order) => this.withoutFinancialDetails(order));
    return page ? { ...page, items: safeRows } : safeRows;
  }
  async findById(id: string, includeFinancialDetails = false) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      include: {
        dispatch: true,
        manualPaymentRecordedBy: { select: { name: true } },
        payments: { include: { recordedBy: { select: { name: true } } }, orderBy: { recordedAt: "asc" } },
        customer: { select: { city: true } },
        items: {
          include: { product: { include: { brand: true } }, deliveries: true },
        },
      },
    });
    if (!order) throw new NotFoundException("Order not found");
    return includeFinancialDetails
      ? order
      : this.withoutFinancialDetails(order);
  }

  private withoutFinancialDetails<
    T extends {
      manualPaymentStatus: unknown;
      manualPaymentMethod: unknown;
      manualPaymentReference: unknown;
      manualPaymentRecordedAt: unknown;
      manualPaymentRecordedBy: unknown;
      manualPaymentRecordedById: unknown;
      payments: unknown;
    },
  >(order: T) {
    const {
      manualPaymentMethod: _manualPaymentMethod,
      manualPaymentReference: _manualPaymentReference,
      manualPaymentRecordedAt: _manualPaymentRecordedAt,
      manualPaymentRecordedBy: _manualPaymentRecordedBy,
      manualPaymentRecordedById: _manualPaymentRecordedById,
      payments: _payments,
      ...operationalOrder
    } = order;
    return operationalOrder;
  }
  async recordManualPayment(
    id: string,
    input: { amountInr: number; method: "CASH" | "UPI" | "CARD" | "OTHER"; reference?: string; note?: string },
    staffId: string,
  ) {
    const order = await this.findById(id, true);
    if (order.manualPaymentStatus === "PAID")
      throw new ConflictException("This order is already marked paid");
    return this.prisma.$transaction(async (db) => {
      await db.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${order.id} FOR UPDATE`;
      const current = await db.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { payments: true },
      });
      if (current.manualPaymentStatus === "PAID")
        throw new ConflictException("This order is already marked paid");
      const totalPaid = current.payments.reduce(
        (sum, payment) => sum.add(payment.amountInr),
        new Prisma.Decimal(0),
      );
      const amount = new Prisma.Decimal(input.amountInr).toDecimalPlaces(2);
      const orderTotal = new Prisma.Decimal(current.grandTotal);
      const newTotalPaid = totalPaid.add(amount);
      if (!amount.gt(0))
        throw new BadRequestException("Payment amount must be greater than zero");
      if (newTotalPaid.gt(orderTotal))
        throw new BadRequestException("Payment amount cannot exceed the remaining order balance");
      const recordedAt = new Date();
      const paymentNumber = await createBusinessReferenceNumber(db, "PM", recordedAt);
      await db.orderPayment.create({
        data: {
          paymentNumber,
          orderId: order.id,
          amountInr: amount,
          method: input.method,
          reference: input.reference || null,
          note: input.note || null,
          recordedAt,
          recordedById: staffId,
        },
      });
      const nextStatus = newTotalPaid.eq(orderTotal) ? "PAID" : "PARTIALLY_PAID";
      await db.order.update({
        where: { id: order.id },
        data: {
          manualPaymentStatus: nextStatus,
          manualPaymentMethod: input.method,
          manualPaymentReference: input.reference || null,
          manualPaymentRecordedAt: recordedAt,
          manualPaymentRecordedById: staffId,
        },
      });
      await db.auditLog.create({
        data: {
          staffId,
          action: "ORDER_OFFLINE_PAYMENT_RECORDED",
          entityType: "ORDER",
          entityId: order.id,
          metadata: {
            paymentNumber,
            method: input.method,
            reference: input.reference || null,
            note: input.note || null,
            amountInr: Number(amount),
            totalPaidInr: Number(newTotalPaid),
            remainingInr: Number(orderTotal.sub(newTotalPaid)),
            status: nextStatus,
          },
        },
      });
      return db.order.findUniqueOrThrow({
        where: { id: order.id },
        include: {
          manualPaymentRecordedBy: { select: { name: true } },
          payments: { include: { recordedBy: { select: { name: true } } }, orderBy: { recordedAt: "asc" } },
        },
      });
    });
  }
  async createDispatchChallan(
    id: string,
    input: {
      truckNumber: string;
      driverName: string;
      driverPhone: string;
      weighbridgeGrossKg: number;
      weighbridgeTareKg: number;
      estimatedArrival: string;
    },
    staffId?: string,
  ) {
    const order = await this.findById(id);
    if (!["PROCESSING_AT_YARD"].includes(order.status))
      throw new BadRequestException(
        "Order must be confirmed for processing before dispatch",
      );
    const netWeightKg = new Prisma.Decimal(input.weighbridgeGrossKg)
      .sub(input.weighbridgeTareKg)
      .toDecimalPlaces(2);
    return this.prisma.$transaction(async (db) => {
      const changed = await db.order.updateMany({
        where: {
          id: order.id,
          status: "PROCESSING_AT_YARD",
          updatedAt: order.updatedAt,
        },
        data: { status: "LOADED_ON_TRUCK" },
      });
      if (changed.count !== 1)
        throw new ConflictException(
          "Order changed; refresh before creating a challan",
        );
      const challan = await db.dispatchChallan.create({
        data: {
          orderId: order.id,
          challanNumber: await createBusinessReferenceNumber(db, "DC"),
          truckNumber: input.truckNumber,
          driverName: input.driverName,
          driverPhone: input.driverPhone,
          weighbridgeGrossKg: input.weighbridgeGrossKg,
          weighbridgeTareKg: input.weighbridgeTareKg,
          netWeightKg,
          estimatedArrival: new Date(input.estimatedArrival),
        },
      });
      await db.transportationPlan.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          createdById: staffId,
          vehicleNumber: input.truckNumber,
          driverName: input.driverName,
          driverPhone: input.driverPhone,
          dispatchAt: new Date(),
          estimatedArrival: new Date(input.estimatedArrival),
          destination: order.deliverySite,
          currentLocation: order.deliverySite,
          status: "DISPATCHED",
        },
        update: {
          vehicleNumber: input.truckNumber,
          driverName: input.driverName,
          driverPhone: input.driverPhone,
          dispatchAt: new Date(),
          estimatedArrival: new Date(input.estimatedArrival),
          status: "DISPATCHED",
        },
      });
      await db.auditLog.create({
        data: {
          staffId,
          action: "DISPATCH_CHALLAN_CREATED",
          entityType: "ORDER",
          entityId: order.id,
          metadata: {
            challanId: challan.id,
            challanNumber: challan.challanNumber,
          },
        },
      });
      return challan;
    });
  }
  async advanceDispatch(id: string, staffId?: string) {
    const order = await this.findById(id);
    if (
      !order.dispatch ||
      order.status === "CANCELLED" ||
      (order.status === "DELIVERED" && order.dispatch.currentStep < 5)
    )
      throw new BadRequestException("Order is not ready for dispatch");
    if (order.dispatch.currentStep >= 5) return order;
    const currentStep = order.dispatch.currentStep;
    await this.prisma.$transaction(async (db) => {
      const updated = await db.dispatchChallan.updateMany({
        where: { orderId: order.id, currentStep },
        data: { currentStep: currentStep + 1 },
      });
      if (updated.count !== 1)
        throw new BadRequestException(
          "Dispatch changed. Refresh and try again.",
        );
      const status =
        currentStep + 1 === 5
          ? "DELIVERED"
          : currentStep + 1 === 4
            ? "IN_TRANSIT"
            : "LOADED_ON_TRUCK";
      if (status === "DELIVERED") {
        const deliveryLines = (order.items || []).flatMap((item) => {
          const received = (item.deliveries || []).reduce(
            (total, delivery) => total.add(delivery.quantity),
            new Prisma.Decimal(0),
          );
          const remaining = item.quantityMt.sub(received);
          return remaining.gt(0)
            ? [{ orderItemId: item.id, quantity: remaining }]
            : [];
        });
        if (deliveryLines.length) {
          await db.orderDelivery.create({
            data: {
              orderId: order.id,
              deliveryNumber: await createBusinessReferenceNumber(db, "DL"),
              deliveredAt: new Date(),
              notes: "Recorded from the completed delivery challan",
              items: { create: deliveryLines },
            },
          });
        }
      }
      const changedOrder = await db.order.updateMany({
        where: {
          id: order.id,
          updatedAt: order.updatedAt,
          status: { notIn: ["CANCELLED", "DELIVERED"] },
        },
        data: { status },
      });
      if (changedOrder.count !== 1)
        throw new ConflictException(
          "Order changed; refresh before advancing dispatch",
        );
      await db.transportationPlan.updateMany({
        where: { orderId: order.id },
        data: {
          status: status === "LOADED_ON_TRUCK" ? "DISPATCHED" : status,
          currentLocation: order.dispatch?.currentLocation || undefined,
        },
      });
      if (status === "DELIVERED")
        await creditDeliveredOrderLoyalty(db, order.id);
      await db.auditLog.create({
        data: {
          staffId,
          action: "DISPATCH_ADVANCED",
          entityType: "ORDER",
          entityId: order.id,
          metadata: {
            previousStep: currentStep,
            currentStep: currentStep + 1,
            previousStatus: order.status,
            status,
          },
        },
      });
      await db.notificationOutbox.create({
        data: {
          type: "dispatch-whatsapp-alert",
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            phone: order.customerPhone,
            truckNo: order.dispatch!.truckNumber,
            status,
          },
        },
      });
    });
    return this.findById(id);
  }
  async generateChallanPdf(id: string): Promise<Buffer> {
    const order = await this.findById(id);
    const dispatch = order.dispatch;
    if (!dispatch) throw new NotFoundException("Dispatch record not found");
    return this.pdfService.generateDeliveryChallanPdf({
      challanNumber: dispatch.challanNumber,
      orderNumber: order.orderNumber,
      truckNumber: dispatch.truckNumber,
      driverName: dispatch.driverName,
      customerName: order.customerName,
      deliverySite: order.deliverySite,
      grossKg: Number(dispatch.weighbridgeGrossKg),
      tareKg: Number(dispatch.weighbridgeTareKg),
      netTonnageMt: Number(dispatch.netWeightKg) / 1000,
      items: order.items.map((i) => ({
        name: i.productName,
        quantityMt: Number(i.quantityMt),
        unit: i.unit,
      })),
    });
  }
}

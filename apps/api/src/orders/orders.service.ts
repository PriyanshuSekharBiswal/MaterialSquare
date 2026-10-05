import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PdfService } from "../pdf/pdf.service";
import { randomUUID } from "node:crypto";
import { creditDeliveredOrderLoyalty } from "./order-loyalty";
import { Prisma } from "@prisma/client";
@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
  ) {}
  findAll() {
    return this.prisma.order.findMany({
      include: {
        dispatch: true,
        items: { include: { product: true, deliveries: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async findById(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      include: {
        dispatch: true,
        customer: { select: { city: true } },
        items: {
          include: { product: { include: { brand: true } }, deliveries: true },
        },
      },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
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
          challanNumber: `MS-DC-${new Date().getFullYear()}-${randomUUID()}`,
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
              deliveryNumber: `MS-DLV-${new Date().getFullYear()}-${randomUUID()}`,
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

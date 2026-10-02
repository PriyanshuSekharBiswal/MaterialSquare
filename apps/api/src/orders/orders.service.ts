import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PdfService } from "../pdf/pdf.service";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
  ) {}
  findAll() {
    return this.prisma.order.findMany({
      include: { dispatch: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  async findById(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      include: {
        dispatch: true,
        customer: { select: { city: true } },
        items: { include: { product: { include: { brand: true } } } },
      },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }
  async confirmPayment(id: string, staffId: string) {
    const order = await this.findById(id);
    if (order.status !== "PENDING_PAYMENT")
      throw new BadRequestException("Only unpaid orders can be confirmed");
    return this.prisma.$transaction(async (db) => {
      const changed = await db.order.updateMany({
        where: { id: order.id, status: "PENDING_PAYMENT" },
        data: { status: "PAYMENT_CONFIRMED" },
      });
      if (changed.count !== 1)
        throw new BadRequestException("Order changed. Refresh and try again.");
      const existing = await db.procurementRequest.findUnique({
        where: { orderId: order.id },
      });
      const procurement = existing
        ? existing
        : await db.procurementRequest.create({
            data: {
              requestNumber: `MS-PR-${new Date().getFullYear()}-${randomUUID()}`,
              orderId: order.id,
              deliveryAddress: order.deliverySite,
              deliveryCity: order.customer.city || "Customer site",
              deliveryPincode: order.pincode,
              items: order.items.map((item) => ({
                productName: item.product.name,
                brand: item.product.brand.name,
                category: item.product.category,
                quantity: item.quantityMt.toNumber(),
                unit: item.product.unit,
                notes: "",
              })),
              notes: `Created from confirmed customer order ${order.orderNumber}`,
              createdById: staffId,
            },
          });
      return { orderId: order.id, orderStatus: "PAYMENT_CONFIRMED", procurement };
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
  ) {
    const order = await this.findById(id);
    if (!["PAYMENT_CONFIRMED", "PROCESSING_AT_YARD"].includes(order.status))
      throw new BadRequestException("Confirm payment before dispatching this order");
    const netWeightKg = new Prisma.Decimal(input.weighbridgeGrossKg)
      .sub(input.weighbridgeTareKg)
      .toDecimalPlaces(2);
    return this.prisma.$transaction(async (db) => {
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
      await db.order.update({ where: { id: order.id }, data: { status: "LOADED_ON_TRUCK" } });
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
      return challan;
    });
  }
  async advanceDispatch(id: string) {
    const order = await this.findById(id);
    if (!order.dispatch || order.status === "CANCELLED")
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
      await db.order.update({ where: { id: order.id }, data: { status } });
      await db.transportationPlan.updateMany({
        where: { orderId: order.id },
        data: {
          status: status === "DELIVERED" ? "DELIVERED" : status,
          currentLocation: order.dispatch?.currentLocation || undefined,
        },
      });
      if (status === "DELIVERED") await this.creditLoyaltyPoints(db, order.id);
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
  private async creditLoyaltyPoints(
    db: Prisma.TransactionClient,
    orderId: string,
  ) {
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    const settings = await db.loyaltyProgramSetting.findUnique({ where: { id: "default" } });
    if (!settings?.enabled || settings.pointsPer100Inr.lte(0)) return;
    if (order.grandTotal.lt(settings.minimumOrderValueInr)) return;
    const alreadyEarned = await db.loyaltyTransaction.findFirst({
      where: { orderId, type: "EARN" },
    });
    if (alreadyEarned) return;
    const points = order.grandTotal
      .div(100)
      .mul(settings.pointsPer100Inr)
      .floor()
      .toNumber();
    if (points <= 0) return;
    const account = await db.loyaltyAccount.upsert({
      where: { customerId: order.customerId },
      create: { customerId: order.customerId, pointsBalance: points },
      update: { pointsBalance: { increment: points } },
    });
    const expiresAt = settings.expiryAfterDays
      ? new Date(Date.now() + settings.expiryAfterDays * 86400000)
      : null;
    await db.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        customerId: order.customerId,
        orderId,
        type: "EARN",
        points,
        description: `Points earned for delivered order ${order.orderNumber}`,
        expiresAt,
      },
    });
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
        name: i.product.name,
        quantityMt: Number(i.quantityMt),
      })),
    });
  }
}

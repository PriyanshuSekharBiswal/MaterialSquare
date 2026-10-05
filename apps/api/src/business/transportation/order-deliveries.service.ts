import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { creditDeliveredOrderLoyalty } from "../../orders/order-loyalty";

export type RecordOrderDeliveryInput = {
  items: Array<{ orderItemId: string; quantity: number }>;
  notes?: string;
};

@Injectable()
export class OrderDeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  record(orderId: string, input: RecordOrderDeliveryInput, staffId: string) {
    return this.prisma.$transaction(async (db) => {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { deliveries: true } },
        },
      });
      if (!order) throw new NotFoundException("Order not found");
      if (["CANCELLED", "DELIVERED"].includes(order.status))
        throw new ConflictException(
          "This order cannot receive another delivery",
        );
      if (!order.items.length)
        throw new ConflictException(
          "This order has no material lines to deliver",
        );

      const plan = await db.transportationPlan.findUnique({
        where: { orderId },
      });
      if (
        !plan ||
        !["OUT_FOR_DELIVERY", "DELAYED", "PARTIALLY_DELIVERED"].includes(
          plan.status,
        )
      )
        throw new ConflictException(
          "Move the delivery plan to out for delivery before recording received quantities",
        );

      if (!input.items.length)
        throw new BadRequestException(
          "Enter at least one delivered material quantity",
        );
      const requested = new Map<string, Prisma.Decimal>();
      for (const entry of input.items) {
        if (requested.has(entry.orderItemId))
          throw new BadRequestException(
            "Each order line can appear only once per delivery",
          );
        requested.set(entry.orderItemId, new Prisma.Decimal(entry.quantity));
      }

      const progress = order.items.map((item) => {
        const delivered = item.deliveries.reduce(
          (total, row) => total.add(row.quantity),
          new Prisma.Decimal(0),
        );
        const quantity = requested.get(item.id);
        if (!quantity)
          return {
            item,
            quantity: new Prisma.Decimal(0),
            complete: delivered.gte(item.quantityMt),
          };
        if (quantity.isNegative() || quantity.isZero())
          throw new BadRequestException(
            "Delivered quantities must be greater than zero",
          );
        if (quantity.gt(item.quantityMt.sub(delivered)))
          throw new ConflictException(
            `Delivered quantity for ${item.productName} exceeds its remaining order quantity`,
          );
        requested.delete(item.id);
        return {
          item,
          quantity,
          complete: delivered.add(quantity).gte(item.quantityMt),
        };
      });
      if (requested.size)
        throw new BadRequestException(
          "A delivered line does not belong to this order",
        );

      const deliveryComplete = progress.every(({ complete }) => complete);
      const now = new Date();
      const orderClaim = await db.order.updateMany({
        where: {
          id: order.id,
          updatedAt: order.updatedAt,
          deliveryVersion: order.deliveryVersion,
          status: { notIn: ["CANCELLED", "DELIVERED"] },
        },
        data: {
          status: deliveryComplete ? "DELIVERED" : "PARTIALLY_DELIVERED",
          deliveryVersion: { increment: 1 },
          updatedAt: now,
        },
      });
      if (orderClaim.count !== 1)
        throw new ConflictException(
          "Order changed; refresh before recording delivery",
        );

      const nextPlanStatus = deliveryComplete
        ? "DELIVERED"
        : "PARTIALLY_DELIVERED";
      const planClaim = await db.transportationPlan.updateMany({
        where: {
          id: plan.id,
          updatedAt: plan.updatedAt,
          status: plan.status,
        },
        data: { status: nextPlanStatus, updatedAt: now },
      });
      if (planClaim.count !== 1)
        throw new ConflictException(
          "Delivery plan changed; refresh and try again",
        );
      if (deliveryComplete)
        await db.dispatchChallan.updateMany({
          where: { orderId: order.id, currentStep: { lt: 5 } },
          data: { currentStep: 5 },
        });

      const deliveryNumber = `MS-DLV-${new Date().getFullYear()}-${randomUUID()}`;
      const delivery = await db.orderDelivery.create({
        data: {
          orderId: order.id,
          deliveryNumber,
          deliveredAt: now,
          notes: input.notes || null,
          items: {
            create: progress
              .filter(({ quantity }) => !quantity.isZero())
              .map(({ item, quantity }) => ({
                orderItemId: item.id,
                quantity,
              })),
          },
        },
        include: { items: { include: { orderItem: true } } },
      });

      await db.auditLog.create({
        data: {
          staffId,
          action: deliveryComplete
            ? "ORDER_DELIVERY_COMPLETED"
            : "ORDER_PARTIALLY_DELIVERED",
          entityType: "ORDER",
          entityId: order.id,
          metadata: {
            deliveryNumber,
            deliveredLineCount: progress.filter(
              ({ quantity }) => !quantity.isZero(),
            ).length,
            status: nextPlanStatus,
          },
        },
      });
      if (deliveryComplete) await creditDeliveredOrderLoyalty(db, order.id);
      return delivery;
    });
  }
}

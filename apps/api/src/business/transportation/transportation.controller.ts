import type { StaffRequest } from "../../auth/staff-request";
import {
  Body,
  ConflictException,
  Controller,
  Get,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { StaffGuard } from "../../auth/access.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { validate } from "../../common/validation";

import { assertTransportationTransition } from "./transportation-status";

import { creditDeliveredOrderLoyalty } from "../../orders/order-loyalty";
import { OrderDeliveriesService } from "./order-deliveries.service";

const transportationInput = z.object({
  transporter: z.string().trim().max(150).nullable().optional(),
  vehicleNumber: z.string().trim().max(30).nullable().optional(),
  driverName: z.string().trim().max(150).nullable().optional(),
  driverPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .nullable()
    .optional(),
  dispatchAt: z.string().datetime().nullable().optional(),
  estimatedArrival: z.string().datetime().nullable().optional(),
  destination: z.string().trim().min(3).max(500).optional(),
  freightAmount: z.number().nonnegative().nullable().optional(),
  status: z
    .enum([
      "PLANNED",
      "SCHEDULED",
      "DISPATCHED",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "DELAYED",
      "CANCELLED",
    ])
    .optional(),
  currentLocation: z.string().max(300).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  notes: z.string().max(3000).nullable().optional(),
});
const orderDeliveryInput = z.object({
  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        quantity: z.number().finite().positive().max(999999999),
      }),
    )
    .min(1)
    .max(200)
    .refine(
      (items) =>
        new Set(items.map((item) => item.orderItemId)).size === items.length,
      "Each order line can appear only once per delivery",
    ),
  notes: z.string().trim().max(3000).optional(),
});

@Controller("transportation")
@UseGuards(StaffGuard)
export class TransportationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveries: OrderDeliveriesService,
  ) {}

  @Get()
  list() {
    return this.prisma.transportationPlan.findMany({
      include: {
        order: {
          include: {
            items: { include: { product: true, deliveries: true } },
            deliveries: {
              include: { items: true },
              orderBy: { deliveredAt: "desc" },
            },
          },
        },
      },
      orderBy: [{ status: "asc" }, { estimatedArrival: "asc" }],
    });
  }

  @Post(":orderId/deliveries")
  recordDelivery(
    @Param("orderId") orderId: string,
    @Body() body: unknown,
    @Req() req: StaffRequest,
  ) {
    if (!["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"].includes(req.user.role))
      throw new ForbiddenException(
        "A dispatch user must record delivered quantities",
      );
    const data = validate(orderDeliveryInput, body);
    return this.deliveries.record(orderId, data, req.user.userId);
  }

  @Put(":orderId")
  async upsert(
    @Param("orderId") orderId: string,
    @Body() body: unknown,
    @Req() req: StaffRequest,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Order not found");
    const data = validate(transportationInput, body);
    const mapped = {
      ...data,
      dispatchAt: data.dispatchAt ? new Date(data.dispatchAt) : data.dispatchAt,
      estimatedArrival: data.estimatedArrival
        ? new Date(data.estimatedArrival)
        : data.estimatedArrival,
      freightAmount:
        data.freightAmount === undefined || data.freightAmount === null
          ? data.freightAmount
          : new Prisma.Decimal(data.freightAmount),
      latitude:
        data.latitude === undefined || data.latitude === null
          ? data.latitude
          : new Prisma.Decimal(data.latitude),
      longitude:
        data.longitude === undefined || data.longitude === null
          ? data.longitude
          : new Prisma.Decimal(data.longitude),
    };
    return this.prisma.$transaction(async (db) => {
      const existing = await db.transportationPlan.findUnique({
        where: { orderId },
      });
      assertTransportationTransition(existing?.status ?? null, data.status);
      if (!existing) {
        const plan = await db.transportationPlan.create({
          data: {
            orderId,
            destination: data.destination || order.deliverySite,
            ...mapped,
          },
        });
        await db.auditLog.create({
          data: {
            staffId: req.user.userId,
            action: "TRANSPORTATION_PLAN_CREATED",
            entityType: "ORDER",
            entityId: orderId,
            metadata: { planId: plan.id, status: plan.status },
          },
        });
        return plan;
      }
      const changed = await db.transportationPlan.updateMany({
        where: { id: existing.id, updatedAt: existing.updatedAt },
        data: mapped,
      });
      if (changed.count !== 1)
        throw new ConflictException(
          "Delivery plan changed; refresh before updating it",
        );
      const orderStatus =
        data.status === "DISPATCHED"
          ? "LOADED_ON_TRUCK"
          : data.status === "IN_TRANSIT"
            ? "IN_TRANSIT"
            : data.status === "OUT_FOR_DELIVERY"
              ? "OUT_FOR_DELIVERY"
              : data.status === "DELIVERED"
                ? "DELIVERED"
                : undefined;
      if (orderStatus && existing.status !== data.status) {
        if (orderStatus === "DELIVERED") {
          const orderItems = await db.orderItem.findMany({
            where: { orderId },
            include: { deliveries: true },
          });
          const fullyReceived =
            orderItems.length > 0 &&
            orderItems.every((item) =>
              item.deliveries
                .reduce(
                  (sum, delivery) => sum.add(delivery.quantity),
                  new Prisma.Decimal(0),
                )
                .gte(item.quantityMt),
            );
          if (!fullyReceived)
            throw new ConflictException(
              "Record all remaining material quantities before marking this order delivered",
            );
        }
        const changedOrder = await db.order.updateMany({
          where: { id: orderId, status: { notIn: ["CANCELLED", "DELIVERED"] } },
          data: {
            status:
              order.status === "PARTIALLY_DELIVERED" &&
              orderStatus !== "DELIVERED"
                ? "PARTIALLY_DELIVERED"
                : orderStatus,
          },
        });
        if (changedOrder.count !== 1)
          throw new ConflictException(
            "The order is already delivered or cancelled",
          );
        const step =
          orderStatus === "DELIVERED"
            ? 5
            : orderStatus === "IN_TRANSIT" || orderStatus === "OUT_FOR_DELIVERY"
              ? 4
              : 3;
        await db.dispatchChallan.updateMany({
          where: { orderId, currentStep: { lt: step } },
          data: { currentStep: step },
        });
        if (orderStatus === "DELIVERED")
          await creditDeliveredOrderLoyalty(db, orderId);
      }
      await db.auditLog.create({
        data: {
          staffId: req.user.userId,
          action:
            data.status && data.status !== existing.status
              ? "TRANSPORTATION_STATUS_CHANGED"
              : "TRANSPORTATION_PLAN_UPDATED",
          entityType: "ORDER",
          entityId: orderId,
          metadata: {
            planId: existing.id,
            previousStatus: existing.status,
            status: data.status || existing.status,
            changedFields: Object.keys(data),
          },
        },
      });
      return db.transportationPlan.findUniqueOrThrow({ where: { orderId } });
    });
  }
}

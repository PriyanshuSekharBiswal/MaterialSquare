import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { StaffGuard } from "../auth/access.guard";
import { PrismaService } from "../prisma/prisma.service";
import { validate } from "../common/validation";
import { expireCustomerLoyaltyPoints } from "./loyalty.service";

type StaffRequest = Request & { user: { userId: string; role: string } };
const followupInput = z.object({
  channel: z.enum(["WHATSAPP", "EMAIL", "INTERNAL"]),
  scheduledAt: z.string().datetime(),
  notes: z.string().max(3000).optional(),
});

@Controller("quotes/:quoteId/followups")
@UseGuards(StaffGuard)
export class QuoteFollowupsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Param("quoteId") quoteId: string) {
    if (!(await this.prisma.quotation.count({ where: { id: quoteId } })))
      throw new NotFoundException("Quotation not found");
    return this.prisma.quotationFollowUp.findMany({
      where: { quotationId: quoteId },
      orderBy: { scheduledAt: "asc" },
    });
  }

  @Post()
  async create(@Param("quoteId") quoteId: string, @Body() body: unknown) {
    const quote = await this.prisma.quotation.findUnique({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException("Quotation not found");
    const data = validate(followupInput, body);
    if (new Date(data.scheduledAt) < new Date())
      throw new BadRequestException("Schedule the follow-up for now or a future time");
    return this.prisma.$transaction(async (tx) => {
      const followup = await tx.quotationFollowUp.create({
        data: { quotationId: quoteId, ...data, scheduledAt: new Date(data.scheduledAt) },
      });
      if (data.channel !== "INTERNAL") {
        await tx.notificationOutbox.create({
          data: {
            type: "quote-follow-up",
            runAt: new Date(data.scheduledAt),
            payload: {
              followupId: followup.id,
              quotationId: quote.id,
              channel: data.channel,
              phone: quote.customerPhone,
              email: quote.customerEmail,
              quoteNumber: quote.quoteNumber,
              notes: data.notes || "",
            },
          },
        });
      }
      return followup;
    });
  }

  @Patch(":id")
  async update(
    @Param("quoteId") quoteId: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const data = validate(
      z.object({
        status: z.enum(["SCHEDULED", "SENT", "CANCELLED", "FAILED"]),
        notes: z.string().max(3000).optional(),
      }),
      body,
    );
    const followup = await this.prisma.quotationFollowUp.findFirst({
      where: { id, quotationId: quoteId },
    });
    if (!followup) throw new NotFoundException("Follow-up not found");
    if (followup.status === "CANCELLED" || followup.status === "SENT")
      throw new ConflictException("This follow-up is already closed");
    return this.prisma.quotationFollowUp.update({
      where: { id },
      data: {
        ...data,
        sentAt: data.status === "SENT" ? new Date() : undefined,
      },
    });
  }
}

const transportationInput = z.object({
  transporter: z.string().trim().max(150).nullable().optional(),
  vehicleNumber: z.string().trim().max(30).nullable().optional(),
  driverName: z.string().trim().max(150).nullable().optional(),
  driverPhone: z.string().regex(/^[6-9]\d{9}$/).nullable().optional(),
  dispatchAt: z.string().datetime().nullable().optional(),
  estimatedArrival: z.string().datetime().nullable().optional(),
  destination: z.string().trim().min(3).max(500).optional(),
  freightAmount: z.number().nonnegative().nullable().optional(),
  status: z.enum(["PLANNED", "SCHEDULED", "DISPATCHED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "DELAYED", "CANCELLED"]).optional(),
  currentLocation: z.string().max(300).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  notes: z.string().max(3000).nullable().optional(),
});

@Controller("transportation")
@UseGuards(StaffGuard)
export class TransportationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.transportationPlan.findMany({
      include: { order: { include: { items: { include: { product: true } } } } },
      orderBy: [{ status: "asc" }, { estimatedArrival: "asc" }],
    });
  }

  @Put(":orderId")
  async upsert(@Param("orderId") orderId: string, @Body() body: unknown) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
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
    return this.prisma.transportationPlan.upsert({
      where: { orderId },
      create: {
        orderId,
        destination: data.destination || order.deliverySite,
        ...mapped,
      },
      update: mapped,
    });
  }
}

const commissionInput = z.object({
  customerId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  beneficiaryName: z.string().trim().min(2).max(150),
  beneficiaryPhone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  basisAmount: z.number().nonnegative(),
  ratePct: z.number().min(0).max(100),
  notes: z.string().max(3000).optional(),
});

@Controller("commissions")
@UseGuards(StaffGuard)
export class CommissionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.commissionRecord.findMany({
      include: { order: true, customer: true, approvedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  @Post()
  async create(@Body() body: unknown) {
    const data = validate(commissionInput, body);
    if (data.customerId && !(await this.prisma.customer.count({ where: { id: data.customerId } })))
      throw new NotFoundException("Customer not found");
    if (data.orderId && !(await this.prisma.order.count({ where: { id: data.orderId } })))
      throw new NotFoundException("Order not found");
    const basisAmount = new Prisma.Decimal(data.basisAmount);
    const ratePct = new Prisma.Decimal(data.ratePct);
    return this.prisma.commissionRecord.create({
      data: {
        ...data,
        basisAmount,
        ratePct,
        amount: basisAmount.mul(ratePct).div(100).toDecimalPlaces(2),
      },
    });
  }

  @Post(":id/approve")
  async approve(@Param("id") id: string, @Req() req: StaffRequest) {
    if (!["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"].includes(req.user.role))
      throw new ForbiddenException("An accounts user must approve this commission");
    const record = await this.prisma.commissionRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException("Commission record not found");
    if (record.status !== "PENDING_REVIEW")
      throw new ConflictException("Only pending commissions can be approved");
    return this.prisma.commissionRecord.update({
      where: { id },
      data: { status: "APPROVED", approvedById: req.user.userId, approvedAt: new Date() },
    });
  }

  @Post(":id/pay")
  async markPaid(@Param("id") id: string, @Req() req: StaffRequest) {
    if (!["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"].includes(req.user.role))
      throw new ForbiddenException("An accounts user must record commission payments");
    const result = await this.prisma.commissionRecord.updateMany({
      where: { id, status: "APPROVED", paidAt: null },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (!result.count) throw new ConflictException("Only approved unpaid commissions can be paid");
    return this.prisma.commissionRecord.findUnique({ where: { id } });
  }
}

const loyaltySettingsInput = z.object({
  enabled: z.boolean(),
  pointsPer100Inr: z.number().min(0).max(100000),
  minimumOrderValueInr: z.number().min(0),
  redemptionValuePerPoint: z.number().min(0).max(1000),
  minimumRedemptionPoints: z.number().int().min(0),
  expiryAfterDays: z.number().int().positive().nullable(),
});
const loyaltyAdjustmentInput = z.object({
  points: z.number().int().min(-1000000).max(1000000).refine((n) => n !== 0),
  description: z.string().trim().min(3).max(300),
  expiresAt: z.string().datetime().nullable().optional(),
});

@Controller("admin/loyalty")
@UseGuards(StaffGuard)
export class LoyaltyManagementController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("settings")
  getSettings() {
    return this.prisma.loyaltyProgramSetting.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    });
  }

  @Put("settings")
  async setSettings(@Body() body: unknown) {
    const data = validate(loyaltySettingsInput, body);
    if (data.enabled && (data.pointsPer100Inr <= 0 || data.redemptionValuePerPoint <= 0))
      throw new BadRequestException("Configure earning and redemption values before enabling loyalty");
    return this.prisma.loyaltyProgramSetting.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: data,
    });
  }

  @Post("customers/:customerId/adjust")
  async adjustCustomer(
    @Param("customerId") customerId: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ) {
    const data = validate(loyaltyAdjustmentInput, body);
    return this.prisma.$transaction(async (tx) => {
      await expireCustomerLoyaltyPoints(tx, customerId);
      if (!(await tx.customer.count({ where: { id: customerId } })))
        throw new NotFoundException("Customer not found");
      const account = await tx.loyaltyAccount.upsert({
        where: { customerId },
        create: { customerId },
        update: {},
      });
      const next = account.pointsBalance + data.points;
      if (next < 0) throw new BadRequestException("Points balance cannot become negative");
      await tx.loyaltyAccount.update({ where: { id: account.id }, data: { pointsBalance: next } });
      return tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          customerId,
          type: data.points > 0 ? "ADJUST" : "REDEEM",
          points: data.points,
          description: data.description,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
          orderId: undefined,
        },
      });
    });
  }
}

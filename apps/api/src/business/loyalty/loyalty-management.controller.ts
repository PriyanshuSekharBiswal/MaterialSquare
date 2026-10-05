import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { StaffGuard } from "../../auth/access.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { validate } from "../../common/validation";
import { expireCustomerLoyaltyPoints } from "./loyalty-expiry";
import type { StaffRequest } from "../../auth/staff-request";

const loyaltySettingsInput = z.object({
  enabled: z.boolean(),
  pointsPer100Inr: z.number().min(0).max(100000),
  minimumOrderValueInr: z.number().min(0),
  redemptionValuePerPoint: z.number().min(0).max(1000),
  minimumRedemptionPoints: z.number().int().min(0),
  expiryAfterDays: z.number().int().positive().nullable(),
});
const loyaltyAdjustmentInput = z.object({
  points: z
    .number()
    .int()
    .min(-1000000)
    .max(1000000)
    .refine((n) => n !== 0),
  description: z.string().trim().min(3).max(300),
  expiresAt: z.string().datetime().nullable().optional(),
});

@Controller("admin/loyalty")
@UseGuards(StaffGuard)
export class LoyaltyManagementController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("settings")
  async getSettings() {
    const settings = await this.prisma.loyaltyProgramSetting.findUnique({
      where: { id: "default" },
    });
    return (
      settings ?? {
        id: "default",
        enabled: false,
        pointsPer100Inr: 0,
        minimumOrderValueInr: 0,
        redemptionValuePerPoint: 0,
        minimumRedemptionPoints: 0,
        expiryAfterDays: null,
      }
    );
  }

  @Put("settings")
  async setSettings(@Req() req: StaffRequest, @Body() body: unknown) {
    const data = validate(loyaltySettingsInput, body);
    if (
      data.enabled &&
      (data.pointsPer100Inr <= 0 || data.redemptionValuePerPoint <= 0)
    )
      throw new BadRequestException(
        "Configure earning and redemption values before enabling loyalty",
      );
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.loyaltyProgramSetting.findUnique({
        where: { id: "default" },
      });
      const settings = await tx.loyaltyProgramSetting.upsert({
        where: { id: "default" },
        create: { id: "default", ...data },
        update: data,
      });
      const changedFields = Object.keys(data).filter(
        (key) =>
          previous?.[key as keyof typeof data] !==
          data[key as keyof typeof data],
      );
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "LOYALTY_SETTINGS_UPDATED",
          entityType: "LOYALTY_SETTINGS",
          entityId: "default",
          metadata: { changedFields, enabled: settings.enabled },
        },
      });
      return settings;
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
      if (next < 0)
        throw new BadRequestException("Points balance cannot become negative");
      await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: { pointsBalance: next },
      });
      const transaction = await tx.loyaltyTransaction.create({
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
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "LOYALTY_POINTS_ADJUSTED",
          entityType: "CUSTOMER_LOYALTY",
          entityId: customerId,
          metadata: {
            transactionId: transaction.id,
            points: data.points,
            resultingBalance: next,
          },
        },
      });
      return transaction;
    });
  }
}

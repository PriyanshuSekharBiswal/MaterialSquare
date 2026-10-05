import { Body, Controller, Get, Put, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { StaffGuard } from "../../auth/access.guard";
import type { StaffRequest } from "../../auth/staff-request";
import { validate } from "../../common/validation";
import { PrismaService } from "../../prisma/prisma.service";
import { DEFAULT_BUSINESS_RULES } from "./business-rules";

const businessRulesInput = z
  .object({
    quotationValidityHours: z.number().int().min(1).max(720),
    sendQuotePublishedNotification: z.boolean(),
    sendQuoteExpiryReminder: z.boolean(),
    expiryReminderHoursBefore: z.number().int().min(1).max(719),
  })
  .refine(
    (value) =>
      !value.sendQuoteExpiryReminder ||
      value.expiryReminderHoursBefore < value.quotationValidityHours,
    {
      message:
        "The expiry reminder must be scheduled before the quotation expires",
      path: ["expiryReminderHoursBefore"],
    },
  );

@Controller("admin/business-rules")
@UseGuards(StaffGuard)
export class BusinessRulesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    const saved = await this.prisma.businessRuleSetting.findUnique({
      where: { id: "global" },
    });
    return saved ?? DEFAULT_BUSINESS_RULES;
  }

  @Put()
  async update(@Body() body: unknown, @Req() req: StaffRequest) {
    const data = validate(businessRulesInput, body);
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.businessRuleSetting.findUnique({
        where: { id: "global" },
      });
      const settings = await tx.businessRuleSetting.upsert({
        where: { id: "global" },
        create: { id: "global", ...data },
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
          action: "BUSINESS_RULES_UPDATED",
          entityType: "BUSINESS_RULES",
          entityId: "global",
          metadata: { changedFields },
        },
      });
      return settings;
    });
  }
}

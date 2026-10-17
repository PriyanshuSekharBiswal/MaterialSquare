import { z } from "zod";
import type { StaffRequest } from "../../auth/staff-request";
import {
  BadRequestException,
  Body,
  Controller,
  ConflictException,
  Delete,
  Req,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { StaffGuard } from "../../auth/access.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { validate } from "../../common/validation";
import { ruleInput } from "../business.schemas";

@Controller("discount-rules")
@UseGuards(StaffGuard)
export class DiscountRulesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async list() {
    const rules = await this.prisma.discountRule.findMany({
      orderBy: [{ priority: "desc" }, { name: "asc" }],
    });
    if (!rules.length) return rules;

    const creationLogs = await this.prisma.auditLog.findMany({
      where: {
        action: "DISCOUNT_RULE_CREATED",
        entityType: "DISCOUNT_RULE",
        entityId: { in: rules.map(({ id }) => id) },
      },
      select: {
        entityId: true,
        staff: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    const creatorByRuleId = new Map<string, string>();
    for (const log of creationLogs) {
      if (log.staff?.name && !creatorByRuleId.has(log.entityId)) {
        creatorByRuleId.set(log.entityId, log.staff.name);
      }
    }
    return rules.map((rule) => ({
      ...rule,
      createdBy: creatorByRuleId.get(rule.id) ?? null,
    }));
  }
  @Post() create(@Body() body: unknown, @Req() req?: StaffRequest) {
    const data = validate(ruleInput, body);
    if (
      data.maximumQuantity &&
      data.minimumQuantity &&
      data.maximumQuantity < data.minimumQuantity
    )
      throw new BadRequestException(
        "Maximum quantity must be greater than the minimum",
      );
    if (
      data.startsAt &&
      data.endsAt &&
      new Date(data.endsAt) < new Date(data.startsAt)
    )
      throw new BadRequestException("End time must follow start time");
    return this.prisma.$transaction(async (tx) => {
      const rule = await tx.discountRule.create({
        data: {
          ...data,
          startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
          endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        },
      });
      await tx.auditLog.create({
        data: {
          staffId: req?.user.userId,
          action: "DISCOUNT_RULE_CREATED",
          entityType: "DISCOUNT_RULE",
          entityId: rule.id,
          metadata: { isActive: rule.isActive },
        },
      });
      return rule;
    });
  }
  @Patch(":id") async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req?: StaffRequest,
  ) {
    const data = validate(
      ruleInput.partial().extend({
        expectedUpdatedAt: z.string().datetime().optional(),
        description: ruleInput.shape.description.nullable(),
        categories: ruleInput.shape.categories.optional(),
        category: ruleInput.shape.category.nullable(),
        minimumQuantity: ruleInput.shape.minimumQuantity.nullable(),
        maximumQuantity: ruleInput.shape.maximumQuantity.nullable(),
        startsAt: ruleInput.shape.startsAt.nullable(),
        endsAt: ruleInput.shape.endsAt.nullable(),
      }),
      body,
    );
    const { expectedUpdatedAt, ...changes } = data;
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.discountRule.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException("Discount rule not found");
      const minimum =
        data.minimumQuantity === undefined
          ? existing.minimumQuantity?.toNumber()
          : data.minimumQuantity;
      const maximum =
        data.maximumQuantity === undefined
          ? existing.maximumQuantity?.toNumber()
          : data.maximumQuantity;
      if (minimum != null && maximum != null && maximum < minimum)
        throw new BadRequestException(
          "Maximum quantity must be greater than the minimum",
        );
      const startsAt =
        data.startsAt === undefined
          ? existing.startsAt
          : data.startsAt
            ? new Date(data.startsAt)
            : null;
      const endsAt =
        data.endsAt === undefined
          ? existing.endsAt
          : data.endsAt
            ? new Date(data.endsAt)
            : null;
      if (startsAt && endsAt && endsAt < startsAt)
        throw new BadRequestException("End time must follow start time");
      const changed = await tx.discountRule.updateMany({
        where: {
          id,
          updatedAt: expectedUpdatedAt
            ? new Date(expectedUpdatedAt)
            : existing.updatedAt,
        },
        data: { ...changes, startsAt, endsAt },
      });
      if (changed.count !== 1)
        throw new ConflictException(
          "Discount rule changed; refresh before updating it",
        );
      await tx.auditLog.create({
        data: {
          staffId: req?.user.userId,
          action: "DISCOUNT_RULE_UPDATED",
          entityType: "DISCOUNT_RULE",
          entityId: id,
          metadata: {
            changedFields: Object.keys(changes),
            previousIsActive: existing.isActive,
            isActive: data.isActive ?? existing.isActive,
          },
        },
      });
      return tx.discountRule.findUniqueOrThrow({ where: { id } });
    });
  }

  @Delete(":id") async delete(
    @Param("id") id: string,
    @Req() req: StaffRequest,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.discountRule.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException("Discount rule not found");
      await tx.discountRule.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "DISCOUNT_RULE_DELETED",
          entityType: "DISCOUNT_RULE",
          entityId: id,
          metadata: {
            name: existing.name,
            wasActive: existing.isActive,
          },
        },
      });
      return { success: true };
    });
  }
}

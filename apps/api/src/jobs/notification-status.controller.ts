import type { Prisma } from "@prisma/client";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { StaffGuard } from "../auth/access.guard";
import { PrismaService } from "../prisma/prisma.service";
import { validate } from "../common/validation";

@Controller("admin/notifications")
@UseGuards(StaffGuard)
export class NotificationStatusController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: unknown) {
    const { page, status, type } = validate(
      z.object({
        page: z.coerce.number().int().min(1).max(100000).default(1),
        status: z
          .enum(["PENDING", "QUEUED", "DELIVERED", "FAILED", "SKIPPED"])
          .optional(),
        type: z.string().trim().max(100).optional(),
      }),
      query,
    );
    const outcomes: Record<string, Prisma.NotificationOutboxWhereInput> = {
      SKIPPED: { skippedAt: { not: null } },
      DELIVERED: { skippedAt: null, deliveredAt: { not: null } },
      FAILED: { skippedAt: null, deliveredAt: null, failedAt: { not: null } },
      QUEUED: {
        skippedAt: null,
        deliveredAt: null,
        failedAt: null,
        queuedAt: { not: null },
      },
      PENDING: {
        skippedAt: null,
        deliveredAt: null,
        failedAt: null,
        queuedAt: null,
      },
    };
    const where: Prisma.NotificationOutboxWhereInput = {
      ...(status ? outcomes[status] : {}),
      ...(type ? { type } : {}),
    };
    const pageSize = 25;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notificationOutbox.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          type: true,
          runAt: true,
          queuedAt: true,
          deliveredAt: true,
          failedAt: true,
          skippedAt: true,
          skipReason: true,
          createdAt: true,
        },
      }),
      this.prisma.notificationOutbox.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        ...item,
        status: item.skippedAt
          ? "SKIPPED"
          : item.deliveredAt
            ? "DELIVERED"
            : item.failedAt
              ? "FAILED"
              : item.queuedAt
                ? "QUEUED"
                : "PENDING",
      })),
      total,
      page,
      pageSize,
    };
  }
}

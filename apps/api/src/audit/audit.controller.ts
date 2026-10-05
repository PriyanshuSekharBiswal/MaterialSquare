import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { StaffGuard } from "../auth/access.guard";
import { validate } from "../common/validation";
import { PrismaService } from "../prisma/prisma.service";

const filters = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    action: z.string().trim().max(100).optional(),
    entityType: z.string().trim().max(100).optional(),
    entityId: z.string().trim().max(200).optional(),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "End date must be on or after start date",
    path: ["to"],
  });

@Controller("admin/audit")
@UseGuards(StaffGuard)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: unknown) {
    const { page, action, entityType, entityId, from, to } = validate(
      filters,
      query,
    );
    const where = {
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(`${from}T00:00:00+05:30`) } : {}),
              ...(to
                ? {
                    lt: new Date(
                      new Date(`${to}T00:00:00+05:30`).getTime() + 86400000,
                    ),
                  }
                : {}),
            },
          }
        : {}),
    };
    const pageSize = 25;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
          staff: { select: { id: true, name: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}

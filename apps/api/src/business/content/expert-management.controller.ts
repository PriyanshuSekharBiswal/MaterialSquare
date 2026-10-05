import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { StaffGuard } from "../../auth/access.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { validate } from "../../common/validation";
import type { StaffRequest } from "../../auth/staff-request";

@Controller("admin/experts")
@UseGuards(StaffGuard)
export class ExpertManagementController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list() {
    return this.prisma.expertAdvisor.findMany({
      orderBy: { updatedAt: "desc" },
    });
  }
  @Post() create(@Req() req: StaffRequest, @Body() body: unknown) {
    const data = validate(
      z.object({
        name: z.string().trim().min(2).max(150),
        serviceType: z.string().trim().min(2).max(100),
        expertise: z.string().trim().min(2).max(500),
        phone: z
          .string()
          .regex(/^[6-9]\d{9}$/)
          .optional(),
        email: z.string().email().optional(),
        city: z.string().max(100).optional(),
        servicePincodes: z
          .array(z.string().regex(/^[1-9]\d{5}$/))
          .max(500)
          .default([]),
        description: z.string().max(5000).optional(),
        imageUrl: z.string().url().optional(),
        isPublished: z.boolean().default(false),
      }),
      body,
    );
    return this.prisma.$transaction(async (tx) => {
      const expert = await tx.expertAdvisor.create({ data });
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: data.isPublished ? "EXPERT_PUBLISHED" : "EXPERT_CREATED",
          entityType: "EXPERT_ADVISOR",
          entityId: expert.id,
          metadata: {
            fields: Object.keys(data).sort(),
            isPublished: expert.isPublished,
            servicePincodeCount: data.servicePincodes.length,
          },
        },
      });
      return expert;
    });
  }
  @Patch(":id") async update(
    @Req() req: StaffRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const data = validate(
      z.object({
        name: z.string().trim().min(2).max(150).optional(),
        serviceType: z.string().trim().min(2).max(100).optional(),
        expertise: z.string().trim().min(2).max(500).optional(),
        phone: z
          .string()
          .regex(/^[6-9]\d{9}$/)
          .nullable()
          .optional(),
        email: z.string().email().nullable().optional(),
        city: z.string().max(100).nullable().optional(),
        servicePincodes: z
          .array(z.string().regex(/^[1-9]\d{5}$/))
          .max(500)
          .optional(),
        description: z.string().max(5000).nullable().optional(),
        imageUrl: z.string().url().nullable().optional(),
        isPublished: z.boolean().optional(),
      }),
      body,
    );
    return this.prisma.$transaction(async (tx) => {
      const expert = await tx.expertAdvisor
        .update({ where: { id }, data })
        .catch((error) => {
          if (error?.code === "P2025") {
            throw new NotFoundException("Expert or service provider not found");
          }
          throw error;
        });
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action:
            data.isPublished === true ? "EXPERT_PUBLISHED" : "EXPERT_UPDATED",
          entityType: "EXPERT_ADVISOR",
          entityId: expert.id,
          metadata: {
            fields: Object.keys(data).sort(),
            isPublished: expert.isPublished,
            ...(data.servicePincodes
              ? { servicePincodeCount: data.servicePincodes.length }
              : {}),
          },
        },
      });
      return expert;
    });
  }
}

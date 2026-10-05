import {
  Module,
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Patch,
  Param,
  NotFoundException,
} from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import { StaffGuard } from "../auth/access.guard";
import type { StaffRequest } from "../auth/staff-request";
import { validate } from "../common/validation";
@Controller("rfqs")
export class RfqsController {
  constructor(private prisma: PrismaService) {}
  @Patch(":id/status")
  @UseGuards(StaffGuard)
  async updateStatus(
    @Req() req: StaffRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const { status } = validate(
      z.object({ status: z.enum(["NEW", "CONTACTED", "QUOTED", "CLOSED"]) }),
      body,
    );
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.rfq.updateMany({
        where: { id },
        data: { status },
      });
      if (!changed.count) throw new NotFoundException("Request not found");
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "RFQ_STATUS_UPDATED",
          entityType: "RFQ",
          entityId: id,
          metadata: { fields: ["status"], status },
        },
      });
    });
    return { id, status };
  }
  @Get()
  @UseGuards(StaffGuard)
  list() {
    return this.prisma.rfq.findMany({ orderBy: { createdAt: "desc" } });
  }
}
@Controller("inquiries")
export class InquiriesController {
  constructor(private prisma: PrismaService) {}
  @Post() async create(@Body() body: unknown) {
    const data = validate(
      z.object({
        name: z.string().trim().min(2).max(150),
        phone: z.string().regex(/^[6-9]\d{9}$/),
        location: z.string().min(2).max(500),
        projectType: z.string().max(100),
        message: z.string().trim().min(1).max(5000),
      }),
      body,
    );
    const saved = await this.prisma.contactInquiry.create({ data });
    return { id: saved.id };
  }
  @Get()
  @UseGuards(StaffGuard)
  list() {
    return this.prisma.contactInquiry.findMany({
      orderBy: { createdAt: "desc" },
    });
  }
}
@Module({ controllers: [RfqsController, InquiriesController] })
export class RfqsModule {}

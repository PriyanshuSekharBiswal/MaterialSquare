import {
  Module,
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  ConflictException,
  Patch,
  Param,
  NotFoundException,
} from "@nestjs/common";
import { isDeepStrictEqual } from "node:util";
import type { Request } from "express";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import { StaffGuard } from "../auth/access.guard";
import { CustomerGuard } from "../auth/customer.guard";
import type { StaffRequest } from "../auth/staff-request";
import { validate } from "../common/validation";
export const RfqSchema = z.object({
  requestId: z.string().uuid().optional(),
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z
    .union([z.string().email().max(254), z.literal("")])
    .optional(),
  companyName: z.string().trim().max(150).optional(),
  shippingAddress: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  pincode: z
    .union([z.string().regex(/^[1-9]\d{5}$/), z.literal("")])
    .optional(),
  siteLocation: z.string().trim().min(2).max(650),
  projectStage: z.string().max(100).optional(),
  deliveryTiming: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  items: z
    .array(
      z.object({
        material: z.string().trim().min(1).max(300),
        brand: z.string().max(100).optional(),
        specification: z.string().max(500).optional(),
        quantity: z.number().finite().positive(),
        unit: z.string().min(1).max(100),
      }),
    )
    .min(1)
    .max(200),
});
@Controller("rfqs")
export class RfqsController {
  constructor(private prisma: PrismaService) {}
  @Post()
  @UseGuards(CustomerGuard)
  async create(
    @Req() req: Request & { customerId: string },
    @Body() body: unknown,
  ) {
    const data = validate(RfqSchema, body);
    const saved = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.update({
        where: { id: req.customerId },
        data: {
          name: data.customerName,
          ...(data.customerEmail !== undefined
            ? { email: data.customerEmail || null }
            : {}),
          ...(data.companyName !== undefined
            ? { companyName: data.companyName || null }
            : {}),
          ...(data.shippingAddress !== undefined
            ? { shippingAddress: data.shippingAddress || null }
            : {}),
          ...(data.city !== undefined ? { city: data.city } : {}),
          ...(data.pincode !== undefined ? { pincode: data.pincode } : {}),
        },
        select: { name: true, phone: true },
      });
      const {
        customerName,
        customerEmail: _email,
        companyName: _company,
        shippingAddress: _address,
        city: _city,
        pincode: _pincode,
        ...requestData
      } = data;
      const { requestId, ...rfqData } = requestData;
      const record = {
        ...rfqData,
        customerId: req.customerId,
        customerName: customer.name,
        customerPhone: customer.phone,
      };
      if (requestId) {
        const saved = await tx.rfq.upsert({
          where: { id: requestId },
          create: { id: requestId, ...record },
          update: {},
        });
        if (
          saved.customerId !== req.customerId ||
          saved.siteLocation !== record.siteLocation ||
          saved.customerName !== record.customerName ||
          saved.notes !== (record.notes ?? null) ||
          saved.deliveryTiming !== (record.deliveryTiming ?? null) ||
          !isDeepStrictEqual(saved.items, record.items)
        )
          throw new ConflictException(
            "This request reference has already been used. Refresh and submit a new request.",
          );
        return saved;
      }
      return tx.rfq.create({
        data: {
          ...rfqData,
          customerId: req.customerId,
          customerName: customer.name,
          customerPhone: customer.phone,
        },
      });
    });
    return { id: saved.id, status: saved.status };
  }
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

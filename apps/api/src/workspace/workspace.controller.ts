import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { StaffGuard } from "../auth/access.guard";
import { PrismaService } from "../prisma/prisma.service";
import { validate } from "../common/validation";
import type { StaffRequest } from "../auth/staff-request";
const searchSchema = z.object({
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  status: z.enum(["", "OPEN", "NEW", "CONTACTED", "QUOTED", "CLOSED"]).default(""),
});
const enquirySchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  email: z.union([z.string().email().max(254), z.literal("")]).default(""),
  siteAddress: z.string().trim().max(500).default(""),
  city: z.string().trim().max(100).default(""),
  pincode: z
    .union([z.string().regex(/^[1-9]\d{5}$/), z.literal("")])
    .default(""),
  source: z.enum(["WHATSAPP", "EMAIL", "PHONE"]),
  status: z.enum(["NEW", "CONTACTED", "QUOTED", "CLOSED"]).default("NEW"),
  materials: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(300),
        brand: z.string().max(100).default(""),
        quantity: z.number().positive().max(1000000),
        unit: z.string().min(1).max(50),
        specification: z.string().max(500).default(""),
      }),
    )
    .max(100)
    .default([]),
  notes: z.string().trim().max(5000).default(""),
});
@Controller("workspace")
@UseGuards(StaffGuard)
export class WorkspaceController {
  constructor(private readonly prisma: PrismaService) {}
  @Get("overview") async overview(@Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "no-store");
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [
      customers,
      newCustomers30Days,
      openFollowups,
      closedFollowups,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({
        where: { createdAt: { gte: last30Days } },
      }),
      this.prisma.staffEnquiry.count({
        where: { status: { not: "CLOSED" } },
      }),
      this.prisma.staffEnquiry.count({ where: { status: "CLOSED" } }),
    ]);
    return {
      customers,
      newCustomers30Days,
      openFollowups,
      closedFollowups,
    };
  }
  @Get("customers") async customers(
    @Query() query: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader("Cache-Control", "no-store");
    const { q, page } = validate(searchSchema, query);
    const where = {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q } },
        { companyName: { contains: q, mode: "insensitive" as const } },
      ],
    };
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * 20,
        take: 20,
        select: {
          id: true,
          name: true,
          phone: true,
          companyName: true,
          city: true,
          createdAt: true,
        },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items, total, page };
  }
  @Get("customers/:id") async customer(
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader("Cache-Control", "no-store");
    const item = await this.prisma.customer.findFirst({
      where: { id },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        companyName: true,
        shippingAddress: true,
        city: true,
        pincode: true,
        createdAt: true,
      },
    });
    if (!item) throw new NotFoundException("Customer not found");
    return item;
  }
  @Get("followups") async followups(
    @Query() query: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader("Cache-Control", "no-store");
    const { q, page, status } = validate(searchSchema, query);
    const where = {
      ...(status === "OPEN"
        ? { status: { not: "CLOSED" } }
        : status
          ? { status }
          : {}),
      OR: [
        { customerName: { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q } },
      ],
    };
    const [items, total] = await Promise.all([
      this.prisma.staffEnquiry.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * 20,
        take: 20,
      }),
      this.prisma.staffEnquiry.count({ where }),
    ]);
    return { items, total, page };
  }
  @Post("followups") create(@Req() req: StaffRequest, @Body() body: unknown) {
    const data = validate(enquirySchema, body);
    return this.prisma.$transaction(async (tx) => {
      const enquiry = await tx.staffEnquiry.create({
        data,
      });
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "STAFF_ENQUIRY_CREATED",
          entityType: "STAFF_ENQUIRY",
          entityId: enquiry.id,
          metadata: {
            source: enquiry.source,
            status: enquiry.status,
            materialCount: Array.isArray(enquiry.materials)
              ? enquiry.materials.length
              : 0,
          },
        },
      });
      return enquiry;
    });
  }
  @Put("followups/:id") async update(
    @Req() req: StaffRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const { version, ...data } = validate(
      enquirySchema.extend({ version: z.number().int().nonnegative() }),
      body,
    );
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.staffEnquiry.findFirst({
        where: { id },
        select: { status: true, version: true },
      });
      if (!existing || existing.version !== version)
        throw new ConflictException(
          "This follow-up changed elsewhere. Reload before editing again.",
        );
      const result = await tx.staffEnquiry.updateMany({
        where: { id, version },
        data: { ...data, version: { increment: 1 } },
      });
      if (!result.count)
        throw new ConflictException(
          "This follow-up changed elsewhere. Reload before editing again.",
        );
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "STAFF_ENQUIRY_UPDATED",
          entityType: "STAFF_ENQUIRY",
          entityId: id,
          metadata: {
            previousStatus: existing.status,
            status: data.status,
            changedFields: Object.keys(data),
          },
        },
      });
      return { success: true };
    });
  }
}

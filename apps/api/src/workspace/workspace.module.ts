import {
  Body,
  ConflictException,
  Controller,
  Get,
  Module,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { StaffGuard } from "../auth/access.guard";
import { demoAuthEnabled } from "../auth/demo-mode";
import { PrismaService } from "../prisma/prisma.service";
import { customerSelect } from "../auth/customer.controller";
import { validate } from "../common/validation";
const searchSchema = z.object({
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  status: z.enum(["", "NEW", "CONTACTED", "QUOTED", "CLOSED"]).default(""),
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
class WorkspaceController {
  constructor(private readonly prisma: PrismaService) {}
  @Get("overview") async overview(@Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "no-store");
    const isDemo = demoAuthEnabled();
    const [customers, openFollowups, closedFollowups] = await Promise.all([
      this.prisma.customer.count({ where: { isDemo } }),
      this.prisma.staffEnquiry.count({
        where: { isDemo, status: { not: "CLOSED" } },
      }),
      this.prisma.staffEnquiry.count({ where: { isDemo, status: "CLOSED" } }),
    ]);
    return { customers, openFollowups, closedFollowups, demo: isDemo };
  }
  @Get("customers") async customers(
    @Query() query: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader("Cache-Control", "no-store");
    const { q, page } = validate(searchSchema, query);
    const where = {
      isDemo: demoAuthEnabled(),
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
      where: { id, isDemo: demoAuthEnabled() },
      select: customerSelect,
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
      isDemo: demoAuthEnabled(),
      ...(status ? { status } : {}),
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
  @Post("followups") create(@Body() body: unknown) {
    return this.prisma.staffEnquiry.create({
      data: { ...validate(enquirySchema, body), isDemo: demoAuthEnabled() },
    });
  }
  @Put("followups/:id") async update(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const { version, ...data } = validate(
      enquirySchema.extend({ version: z.number().int().nonnegative() }),
      body,
    );
    const result = await this.prisma.staffEnquiry.updateMany({
      where: { id, version, isDemo: demoAuthEnabled() },
      data: { ...data, version: { increment: 1 } },
    });
    if (!result.count)
      throw new ConflictException(
        "This follow-up changed elsewhere. Reload before editing again.",
      );
    return { success: true };
  }
}
@Module({ controllers: [WorkspaceController] })
export class WorkspaceModule {}

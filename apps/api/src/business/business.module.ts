import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { StaffGuard } from "../auth/access.guard";
import { PrismaService } from "../prisma/prisma.service";
import { PdfModule } from "../pdf/pdf.module";
import { PdfService } from "../pdf/pdf.service";
import { validate } from "../common/validation";
import {
  CommissionController,
  LoyaltyManagementController,
  QuoteFollowupsController,
  TransportationController,
} from "./workflows.controller";

type StaffRequest = Request & {
  user: { userId: string; role: string };
};
const supplierInput = z.object({
  name: z.string().trim().min(2).max(150),
  legalName: z.string().trim().max(200).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  email: z.union([z.string().email().max(254), z.literal("")]).optional(),
  gstin: z.union([z.string().trim().max(15), z.literal("")]).optional(),
  address: z.string().trim().min(2).max(500),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().max(100).default("Uttar Pradesh"),
  pincode: z.string().regex(/^[1-9]\d{5}$/),
  servicePincodes: z.array(z.string().regex(/^[1-9]\d{5}$/)).max(100).default([]),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).default("PENDING"),
  notes: z.string().max(5000).optional(),
});
const supplierProductInput = z.object({
  productName: z.string().trim().min(1).max(200),
  brand: z.string().max(100).default(""),
  category: z.string().trim().min(1).max(100),
  supplierSku: z.string().max(100).optional(),
  unit: z.string().trim().min(1).max(50),
  minimumOrderQty: z.number().positive().optional(),
  lastQuotedPrice: z.number().nonnegative().optional(),
  isActive: z.boolean().default(true),
});
const procurementItem = z.object({
  productName: z.string().trim().min(1).max(200),
  brand: z.string().max(100).default(""),
  category: z.string().max(100),
  quantity: z.number().finite().positive(),
  unit: z.string().trim().min(1).max(50),
  notes: z.string().max(500).optional(),
});
const procurementInput = z.object({
  orderId: z.string().optional(),
  deliveryAddress: z.string().trim().min(2).max(500),
  deliveryCity: z.string().trim().min(2).max(100),
  deliveryPincode: z.string().regex(/^[1-9]\d{5}$/),
  requiredBy: z.string().datetime().optional(),
  items: z.array(procurementItem).min(1).max(200),
  notes: z.string().max(5000).optional(),
});
const supplierQuoteInput = z.object({
  supplierId: z.string().uuid(),
  totalAmount: z.number().finite().nonnegative(),
  leadTimeDays: z.number().int().nonnegative().max(365).optional(),
  available: z.boolean().default(true),
  validUntil: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
});
const purchaseOrderInput = z.object({
  supplierQuoteId: z.string().uuid(),
  shippingAddress: z.string().trim().min(2).max(500),
  shippingContact: z.string().trim().min(10).max(100),
  taxAmount: z.number().nonnegative().default(0),
  freightAmount: z.number().nonnegative().default(0),
  notes: z.string().max(5000).optional(),
});
const ruleInput = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().max(1000).optional(),
  deliveryPincodes: z.array(z.string().regex(/^[1-9]\d{5}$/)).max(500).default([]),
  category: z.string().max(100).optional(),
  minimumQuantity: z.number().positive().optional(),
  maximumQuantity: z.number().positive().optional(),
  percentageOff: z.number().min(0).max(100).default(0),
  fixedAmountOff: z.number().min(0).default(0),
  priority: z.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(false),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

@Controller("suppliers")
@UseGuards(StaffGuard)
class SuppliersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query("q") q = "", @Query("status") status?: string) {
    return this.prisma.supplier.findMany({
      where: {
        ...(status ? { status: status as "PENDING" | "ACTIVE" | "SUSPENDED" } : {}),
        ...(q.trim()
          ? {
              OR: [
                { name: { contains: q.trim(), mode: "insensitive" as const } },
                { city: { contains: q.trim(), mode: "insensitive" as const } },
                { pincode: { contains: q.trim() } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { products: true, ratings: true } } },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });
  }

  @Post()
  create(@Body() body: unknown) {
    const data = validate(supplierInput, body);
    return this.prisma.supplier.create({ data });
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        products: { orderBy: [{ category: "asc" }, { productName: "asc" }] },
        ratings: { orderBy: { createdAt: "desc" }, take: 50 },
        quotes: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!supplier) throw new NotFoundException("Supplier not found");
    const averageRating = supplier.ratings.length
      ? supplier.ratings.reduce(
          (sum, rating) =>
            sum +
            rating.priceScore +
            rating.deliveryScore +
            rating.availabilityScore +
            rating.qualityScore +
            rating.serviceScore,
          0,
        ) /
        (supplier.ratings.length * 5)
      : null;
    return { ...supplier, averageRating };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown) {
    const data = validate(supplierInput.partial(), body);
    const exists = await this.prisma.supplier.count({ where: { id } });
    if (!exists) throw new NotFoundException("Supplier not found");
    return this.prisma.supplier.update({ where: { id }, data });
  }

  @Post(":id/products")
  async addProduct(@Param("id") id: string, @Body() body: unknown) {
    const supplier = await this.prisma.supplier.count({ where: { id } });
    if (!supplier) throw new NotFoundException("Supplier not found");
    return this.prisma.supplierProduct.create({
      data: { supplierId: id, ...validate(supplierProductInput, body) },
    });
  }

  @Post(":id/ratings")
  async rate(
    @Param("id") id: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ) {
    const data = validate(
      z.object({
        priceScore: z.number().int().min(1).max(5),
        deliveryScore: z.number().int().min(1).max(5),
        availabilityScore: z.number().int().min(1).max(5),
        qualityScore: z.number().int().min(1).max(5),
        serviceScore: z.number().int().min(1).max(5),
        comment: z.string().max(2000).optional(),
      }),
      body,
    );
    if (!(await this.prisma.supplier.count({ where: { id } })))
      throw new NotFoundException("Supplier not found");
    return this.prisma.supplierRating.create({
      data: { supplierId: id, staffId: req.user.userId, ...data },
    });
  }
}

@Controller("procurement")
@UseGuards(StaffGuard)
class ProcurementController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.procurementRequest.findMany({
      include: {
        supplierQuotes: { include: { supplier: true, purchaseOrder: true }, orderBy: { totalAmount: "asc" } },
        purchaseOrders: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  @Post()
  create(@Req() req: StaffRequest, @Body() body: unknown) {
    const data = validate(procurementInput, body);
    return this.prisma.procurementRequest.create({
      data: {
        ...data,
        requiredBy: data.requiredBy ? new Date(data.requiredBy) : undefined,
        requestNumber: `MS-PR-${new Date().getFullYear()}-${randomUUID()}`,
        createdById: req.user.userId,
      },
    });
  }

  @Get(":id/suppliers")
  async candidates(@Param("id") id: string) {
    const request = await this.prisma.procurementRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException("Procurement request not found");
    const items = z.array(procurementItem).parse(request.items);
    const suppliers = await this.prisma.supplier.findMany({
      where: { status: "ACTIVE" },
      include: { products: { where: { isActive: true } }, ratings: true },
    });
    const candidates = suppliers
      .map((supplier) => {
        const matchedItems = items.filter((item) =>
          supplier.products.some(
            (product) =>
              product.productName.toLowerCase() === item.productName.toLowerCase() &&
              (!item.brand || product.brand.toLowerCase() === item.brand.toLowerCase()),
          ),
        );
        const serviceAreaMatch =
          supplier.pincode === request.deliveryPincode ||
          supplier.servicePincodes.includes(request.deliveryPincode);
        const scores = supplier.ratings.flatMap((rating) => [
          rating.priceScore,
          rating.deliveryScore,
          rating.availabilityScore,
          rating.qualityScore,
          rating.serviceScore,
        ]);
        return {
          ...supplier,
          matchedItems: matchedItems.map((item) => item.productName),
          serviceAreaMatch,
          averageScore: scores.length
            ? scores.reduce((sum, value) => sum + value, 0) / scores.length
            : null,
        };
      })
      .filter((supplier) => supplier.matchedItems.length > 0)
      .sort(
        (a, b) =>
          Number(b.serviceAreaMatch) - Number(a.serviceAreaMatch) ||
          (b.averageScore || 0) - (a.averageScore || 0),
      );
    return { deliveryPincode: request.deliveryPincode, candidates };
  }

  @Post(":id/quotes")
  async addSupplierQuote(@Param("id") id: string, @Body() body: unknown) {
    const request = await this.prisma.procurementRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException("Procurement request not found");
    const data = validate(supplierQuoteInput, body);
    const supplier = await this.prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier || supplier.status !== "ACTIVE")
      throw new BadRequestException("Choose an active registered supplier");
    const supplierQuote = await this.prisma.supplierQuote.upsert({
      where: { requestId_supplierId: { requestId: id, supplierId: supplier.id } },
      create: {
        requestId: id,
        supplierId: supplier.id,
        totalAmount: data.totalAmount,
        leadTimeDays: data.leadTimeDays,
        available: data.available,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        notes: data.notes,
      },
      update: {
        totalAmount: data.totalAmount,
        leadTimeDays: data.leadTimeDays,
        available: data.available,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: data.notes,
        status: "RECEIVED",
      },
    });
    await this.prisma.procurementRequest.update({
      where: { id },
      data: { status: "COMPARING" },
    });
    return supplierQuote;
  }
}

@Controller("purchase-orders")
@UseGuards(StaffGuard)
class PurchaseOrdersController {
  constructor(private readonly prisma: PrismaService, private readonly pdf: PdfService) {}

  @Get()
  list() {
    return this.prisma.purchaseOrder.findMany({
      include: { supplier: true, request: true, supplierQuote: true },
      orderBy: { createdAt: "desc" },
    });
  }

  @Get(":id/pdf")
  async pdfDocument(@Param("id") id: string, @Res() res: Response) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id }, include: { supplier: true },
    });
    if (!po) throw new NotFoundException("Purchase order not found");
    const buffer = await this.pdf.generatePurchaseOrderPdf(po);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${po.purchaseOrderNumber}.pdf"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Post()
  async create(@Body() body: unknown) {
    const data = validate(purchaseOrderInput, body);
    const quote = await this.prisma.supplierQuote.findUnique({
      where: { id: data.supplierQuoteId },
      include: { request: true, supplier: true, purchaseOrder: true },
    });
    if (!quote || !quote.available)
      throw new NotFoundException("Available supplier quote not found");
    if (quote.purchaseOrder)
      throw new ConflictException("A purchase order already exists for this supplier quote");
    const subtotal = quote.totalAmount;
    const totalAmount = subtotal.add(data.taxAmount).add(data.freightAmount);
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          purchaseOrderNumber: `MS-PO-${new Date().getFullYear()}-${randomUUID()}`,
          requestId: quote.requestId,
          supplierId: quote.supplierId,
          supplierQuoteId: quote.id,
          shippingAddress: data.shippingAddress,
          shippingContact: data.shippingContact,
          items: quote.request.items as Prisma.InputJsonValue,
          subtotal,
          taxAmount: data.taxAmount,
          freightAmount: data.freightAmount,
          totalAmount,
          notes: data.notes,
        },
        include: { supplier: true, request: true, supplierQuote: true },
      });
      await tx.supplierQuote.update({ where: { id: quote.id }, data: { status: "SELECTED" } });
      await tx.procurementRequest.update({ where: { id: quote.requestId }, data: { status: "APPROVAL_PENDING" } });
      return po;
    });
  }

  @Post(":id/approve")
  async approve(@Param("id") id: string, @Req() req: StaffRequest) {
    if (!["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"].includes(req.user.role))
      throw new ForbiddenException("A procurement approver must authorize this order");
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException("Purchase order not found");
    if (po.status !== "PENDING_APPROVAL" && po.status !== "DRAFT")
      throw new ConflictException("This purchase order cannot be approved in its current state");
    const result = await this.prisma.purchaseOrder.updateMany({
      where: { id, status: { in: ["PENDING_APPROVAL", "DRAFT"] } },
      data: { status: "APPROVED", approvedById: req.user.userId, approvedAt: new Date() },
    });
    if (!result.count) throw new ConflictException("Purchase order state changed; refresh and try again");
    return this.prisma.purchaseOrder.findUnique({ where: { id } });
  }

  @Post(":id/send")
  async send(@Param("id") id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true },
    });
    if (!po) throw new NotFoundException("Purchase order not found");
    if (po.status !== "APPROVED")
      throw new ConflictException("Approve the purchase order before sending it");
    const document = await this.pdf.generatePurchaseOrderPdf(po);
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.purchaseOrder.updateMany({
        where: { id, status: "APPROVED" },
        data: { status: "SENT", sentAt: new Date() },
      });
      if (!changed.count)
        throw new ConflictException("Purchase order was already sent or changed");
      await tx.notificationOutbox.create({
        data: {
          type: "purchase-order-sent",
          payload: {
            purchaseOrderId: po.id,
            purchaseOrderNumber: po.purchaseOrderNumber,
            supplierEmail: po.supplier.email,
            supplierPhone: po.supplier.phone,
            attachment: {
              fileName: `${po.purchaseOrderNumber}.pdf`,
              contentType: "application/pdf",
              contentBase64: document.toString("base64"),
            },
          },
        },
      });
      await tx.procurementRequest.update({ where: { id: po.requestId }, data: { status: "ORDERED" } });
      return tx.purchaseOrder.findUnique({ where: { id } });
    });
  }
}

@Controller("discount-rules")
@UseGuards(StaffGuard)
class DiscountRulesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list() {
    return this.prisma.discountRule.findMany({ orderBy: [{ priority: "desc" }, { name: "asc" }] });
  }
  @Post() create(@Body() body: unknown) {
    const data = validate(ruleInput, body);
    if (data.maximumQuantity && data.minimumQuantity && data.maximumQuantity < data.minimumQuantity)
      throw new BadRequestException("Maximum quantity must be greater than the minimum");
    return this.prisma.discountRule.create({
      data: {
        ...data,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      },
    });
  }
  @Patch(":id") async update(@Param("id") id: string, @Body() body: unknown) {
    const data = validate(ruleInput.partial(), body);
    if (data.maximumQuantity && data.minimumQuantity && data.maximumQuantity < data.minimumQuantity)
      throw new BadRequestException("Maximum quantity must be greater than the minimum");
    if (!(await this.prisma.discountRule.count({ where: { id } })))
      throw new NotFoundException("Discount rule not found");
    return this.prisma.discountRule.update({
      where: { id },
      data: {
        ...data,
        startsAt: data.startsAt ? new Date(data.startsAt) : data.startsAt,
        endsAt: data.endsAt ? new Date(data.endsAt) : data.endsAt,
      },
    });
  }
}

@Controller("blogs")
class PublicBlogsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  list(@Query("page") page = "1") {
    const parsedPage = Math.max(1, Math.min(1000, Number(page) || 1));
    return this.prisma.blogPost.findMany({
      where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      skip: (parsedPage - 1) * 20,
      take: 20,
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        body: true,
        featuredImageUrl: true,
        publishedAt: true,
        authorName: true,
      },
    });
  }
  @Get(":slug")
  async detail(@Param("slug") slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, status: "PUBLISHED", publishedAt: { lte: new Date() } },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        body: true,
        featuredImageUrl: true,
        publishedAt: true,
        authorName: true,
      },
    });
    if (!post) throw new NotFoundException("Article not found");
    return post;
  }
}

@Controller("admin/blogs")
@UseGuards(StaffGuard)
class BlogManagementController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list() {
    return this.prisma.blogPost.findMany({ orderBy: { updatedAt: "desc" } });
  }
  @Post()
  create(@Body() body: unknown) {
    const data = validate(
      z.object({
        title: z.string().trim().min(3).max(200),
        slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(220),
        summary: z.string().trim().min(10).max(500),
        body: z.string().trim().min(20).max(50000),
        featuredImageUrl: z.string().url().optional(),
        status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
        authorName: z.string().max(150).optional(),
      }),
      body,
    );
    return this.prisma.blogPost.create({
      data: {
        ...data,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      },
    });
  }
  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown) {
    const data = validate(
      z.object({
        title: z.string().trim().min(3).max(200).optional(),
        slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(220).optional(),
        summary: z.string().trim().min(10).max(500).optional(),
        body: z.string().trim().min(20).max(50000).optional(),
        featuredImageUrl: z.string().url().nullable().optional(),
        status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
        authorName: z.string().max(150).nullable().optional(),
      }),
      body,
    );
    const previous = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!previous) throw new NotFoundException("Article not found");
    return this.prisma.blogPost.update({
      where: { id },
      data: {
        ...data,
        publishedAt:
          data.status === "PUBLISHED"
            ? previous.publishedAt || new Date()
            : data.status
              ? null
              : undefined,
      },
    });
  }
  @Delete(":id")
  async archive(@Param("id") id: string) {
    if (!(await this.prisma.blogPost.count({ where: { id } })))
      throw new NotFoundException("Article not found");
    return this.prisma.blogPost.update({
      where: { id },
      data: { status: "ARCHIVED", publishedAt: null },
    });
  }
}

@Controller("experts")
class PublicExpertsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  list() {
    return this.prisma.expertAdvisor.findMany({
      where: { isPublished: true },
      orderBy: [{ serviceType: "asc" }, { name: "asc" }],
    });
  }
}

@Controller("admin/experts")
@UseGuards(StaffGuard)
class ExpertManagementController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list() {
    return this.prisma.expertAdvisor.findMany({ orderBy: { updatedAt: "desc" } });
  }
  @Post() create(@Body() body: unknown) {
    const data = validate(
      z.object({
        name: z.string().trim().min(2).max(150),
        serviceType: z.string().trim().min(2).max(100),
        expertise: z.string().trim().min(2).max(500),
        phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
        email: z.string().email().optional(),
        city: z.string().max(100).optional(),
        servicePincodes: z.array(z.string().regex(/^[1-9]\d{5}$/)).max(500).default([]),
        description: z.string().max(5000).optional(),
        imageUrl: z.string().url().optional(),
        isPublished: z.boolean().default(false),
      }),
      body,
    );
    return this.prisma.expertAdvisor.create({ data });
  }
  @Patch(":id") async update(@Param("id") id: string, @Body() body: unknown) {
    const data = validate(
      z.object({
        name: z.string().trim().min(2).max(150).optional(),
        serviceType: z.string().trim().min(2).max(100).optional(),
        expertise: z.string().trim().min(2).max(500).optional(),
        phone: z.string().regex(/^[6-9]\d{9}$/).nullable().optional(),
        email: z.string().email().nullable().optional(),
        city: z.string().max(100).nullable().optional(),
        servicePincodes: z.array(z.string().regex(/^[1-9]\d{5}$/)).max(500).optional(),
        description: z.string().max(5000).nullable().optional(),
        imageUrl: z.string().url().nullable().optional(),
        isPublished: z.boolean().optional(),
      }),
      body,
    );
    if (!(await this.prisma.expertAdvisor.count({ where: { id } })))
      throw new NotFoundException("Expert or service provider not found");
    return this.prisma.expertAdvisor.update({ where: { id }, data });
  }
}

@Module({
  imports: [PdfModule],
  controllers: [
    SuppliersController,
    ProcurementController,
    PurchaseOrdersController,
    DiscountRulesController,
    PublicBlogsController,
    BlogManagementController,
    PublicExpertsController,
    ExpertManagementController,
    QuoteFollowupsController,
    TransportationController,
    CommissionController,
    LoyaltyManagementController,
  ],
})
export class BusinessModule {}

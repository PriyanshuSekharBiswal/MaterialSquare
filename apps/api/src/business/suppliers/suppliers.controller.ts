import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { StaffGuard } from "../../auth/access.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { validate } from "../../common/validation";
import type { StaffRequest } from "../../auth/staff-request";
import { supplierInput, supplierProductInput } from "../business.schemas";

@Controller("suppliers")
@UseGuards(StaffGuard)
export class SuppliersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query("q") q = "", @Query("status") status?: string) {
    return this.prisma.supplier.findMany({
      where: {
        ...(status
          ? { status: status as "PENDING" | "ACTIVE" | "SUSPENDED" }
          : {}),
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
  create(@Req() req: StaffRequest, @Body() body: unknown) {
    const data = validate(supplierInput, body);
    return this.prisma.$transaction(async (db) => {
      const supplier = await db.supplier.create({ data });
      await db.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "SUPPLIER_CREATED",
          entityType: "SUPPLIER",
          entityId: supplier.id,
          metadata: { status: supplier.status },
        },
      });
      return supplier;
    });
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
  async update(
    @Param("id") id: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ) {
    const data = validate(supplierInput.partial(), body);
    return this.prisma.$transaction(async (db) => {
      const exists = await db.supplier.findUnique({ where: { id } });
      if (!exists) throw new NotFoundException("Supplier not found");
      const supplier = await db.supplier.update({ where: { id }, data });
      await db.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "SUPPLIER_UPDATED",
          entityType: "SUPPLIER",
          entityId: id,
          metadata: { changedFields: Object.keys(data) },
        },
      });
      return supplier;
    });
  }

  @Post(":id/products")
  async addProduct(
    @Param("id") id: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ) {
    const data = validate(supplierProductInput, body);
    return this.prisma.$transaction(async (db) => {
      const supplier = await db.supplier.count({ where: { id } });
      if (!supplier) throw new NotFoundException("Supplier not found");
      const product = await db.supplierProduct.create({
        data: { supplierId: id, ...data },
      });
      await db.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "SUPPLIER_PRODUCT_ADDED",
          entityType: "SUPPLIER_PRODUCT",
          entityId: product.id,
          metadata: { supplierId: id, category: product.category },
        },
      });
      return product;
    });
  }

  @Patch(":id/products/:productId")
  async updateProduct(
    @Param("id") id: string,
    @Param("productId") productId: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ) {
    const data = validate(
      supplierProductInput.partial().extend({
        minimumOrderQty: z.number().positive().nullable().optional(),
        lastQuotedPrice: z.number().nonnegative().nullable().optional(),
      }),
      body,
    );
    return this.prisma.$transaction(async (db) => {
      const changed = await db.supplierProduct.updateMany({
        where: { id: productId, supplierId: id },
        data,
      });
      if (!changed.count)
        throw new NotFoundException("Supplier product not found");
      const product = await db.supplierProduct.findUnique({
        where: { id: productId },
      });
      await db.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "SUPPLIER_PRODUCT_UPDATED",
          entityType: "SUPPLIER_PRODUCT",
          entityId: productId,
          metadata: { supplierId: id, changedFields: Object.keys(data) },
        },
      });
      return product;
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
    return this.prisma.$transaction(async (db) => {
      if (!(await db.supplier.count({ where: { id } })))
        throw new NotFoundException("Supplier not found");
      const rating = await db.supplierRating.create({
        data: { supplierId: id, staffId: req.user.userId, ...data },
      });
      await db.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "SUPPLIER_RATED",
          entityType: "SUPPLIER",
          entityId: id,
          metadata: { ratingId: rating.id, scoreCount: 5 },
        },
      });
      return rating;
    });
  }
}

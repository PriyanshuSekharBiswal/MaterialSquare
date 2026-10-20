import { StaffGuard } from "../auth/access.guard";
import { validate } from "../common/validation";
import { z } from "zod";
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Post,
  Delete,
  Put,
  Req,
  Res,
  Query,
} from "@nestjs/common";
import { CatalogListingInput, ProductsService } from "./products.service";
import type { StaffRequest } from "../auth/staff-request";
import type { Response } from "express";
import { parsePagination } from "../common/pagination";

const optionalText = z.string().trim().max(500).nullable().optional();
const optionalDate = z
  .string()
  .date()
  .nullable()
  .optional()
  .transform((value) => (value ? new Date(`${value}T00:00:00.000Z`) : null));
const imagePath = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (value) =>
      (value.startsWith("/") && !value.startsWith("//")) ||
      /^https:\/\//i.test(value),
    "Use a site image path or an HTTPS image URL",
  );
const quantityBreakSchema = z.object({
  minimumQuantity: z.number().finite().positive(),
  unitPrice: z.number().finite().nonnegative(),
});
const availabilityStatusSchema = z.enum([
  "IN_STOCK",
  "OUT_OF_STOCK",
  "CHECK_AVAILABILITY",
]);
const partnerBrandsSchema = z
  .array(
    z
      .object({
        id: z
          .string()
          .trim()
          .min(2)
          .max(80)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        name: z.string().trim().min(2).max(120),
        category: z.string().trim().max(80).optional(),
        categories: z.array(z.string().trim().min(2).max(80)).max(20).optional(),
        tagline: z.string().trim().max(160),
        logoUrl: imagePath.nullable().optional(),
        isActive: z.boolean(),
        sortOrder: z.number().int().min(0).max(100000),
      })
      .strict()
      .refine((brand) => Boolean(brand.categories?.length || brand.category), {
        message: "Add at least one brand category",
        path: ["categories"],
      })
      .transform((brand) => {
        const categories = Array.from(new Set([...(brand.categories || []), ...(brand.category ? [brand.category] : [])]));
        return { ...brand, category: categories[0] || "", categories };
      }),
  )
  .max(200)
  .refine(
    (brands) =>
      new Set(brands.map((brand) => brand.id)).size === brands.length &&
      new Set(brands.map((brand) => brand.name.toLocaleLowerCase())).size ===
        brands.length,
    "Brand names and IDs must be unique",
  );
const catalogueCategoriesSchema = z.array(z.object({
  id: z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label: z.string().trim().min(1).max(120),
  active: z.boolean(),
  aliases: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
}).strict()).max(200).refine(
  (categories) => new Set(categories.map((category) => category.id)).size === categories.length &&
    new Set(categories.map((category) => category.label.toLocaleLowerCase())).size === categories.length,
  "Category names and IDs must be unique",
);
const variantSchema = z
  .object({
    id: z.string().uuid().optional(),
    code: z.string().trim().max(80).nullable().optional(),
    label: z.string().trim().min(1).max(160),
    attributes: z.record(z.string(), z.string().trim().max(120)).default({}),
    unit: z.string().trim().min(1).max(100),
    image: imagePath.nullable().optional(),
    galleryImages: z.array(imagePath).max(4).default([]),
    price: z.number().finite().nonnegative().nullable().optional(),
    compareAtPrice: z.number().finite().nonnegative().nullable().optional(),
    priceNote: z.string().trim().max(120).nullable().optional(),
    offerLabel: z.string().trim().max(120).nullable().optional(),
    offerStartsAt: optionalDate,
    offerEndsAt: optionalDate,
    isInStock: z.boolean().default(false),
    availabilityStatus: availabilityStatusSchema.optional(),
    stockQuantity: z.number().finite().nonnegative().nullable().optional(),
    minOrderQuantity: z.number().finite().positive().nullable().optional(),
    quantityBreaks: z.array(quantityBreakSchema).max(50).default([]),
    sortOrder: z.number().int().min(0).max(100000).default(0),
  })
  .refine(
    (variant) =>
      variant.compareAtPrice == null ||
      variant.price == null ||
      variant.compareAtPrice >= variant.price,
    {
      message:
        "Original price must be equal to or greater than the selling price",
      path: ["compareAtPrice"],
    },
  )
  .refine(
    (variant) =>
      !variant.offerStartsAt ||
      !variant.offerEndsAt ||
      variant.offerStartsAt <= variant.offerEndsAt,
    {
      message: "Offer end date must be on or after its start date",
      path: ["offerEndsAt"],
    },
  )
  .refine(
    (variant) =>
      variant.quantityBreaks.every(
        (row, index, rows) =>
          (index === 0 ||
            row.minimumQuantity > rows[index - 1].minimumQuantity) &&
          (index === 0 || row.unitPrice <= rows[index - 1].unitPrice),
      ),
    {
      message:
        "Quantity breaks must increase by quantity and not increase the unit price",
      path: ["quantityBreaks"],
    },
  );
const listingSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    code: z.string().trim().max(80).nullable().optional(),
    name: z.string().trim().min(2).max(180),
    brand: z.string().trim().max(120).default(""),
    brandTagline: optionalText,
    category: z.string().trim().min(2).max(80),
    categoryLabel: z.string().trim().min(2).max(120),
    unit: z.string().trim().min(1).max(100),
    packaging: optionalText,
    image: imagePath.nullable().optional(),
    photoBanner: z.string().trim().max(40).nullable().optional(),
    galleryImages: z.array(imagePath).max(4).default([]),
    grade: optionalText,
    description: z.string().trim().max(3000).nullable().optional(),
    minOrderQty: optionalText,
    dispatchTime: optionalText,
    price: z.number().finite().nonnegative().nullable().optional(),
    compareAtPrice: z.number().finite().nonnegative().nullable().optional(),
    priceNote: z.string().trim().max(120).nullable().optional(),
    offerLabel: z.string().trim().max(120).nullable().optional(),
    offerStartsAt: optionalDate,
    offerEndsAt: optionalDate,
    isInStock: z.boolean(),
    availabilityStatus: availabilityStatusSchema.optional(),
    isPublished: z.boolean(),
    features: z.array(z.string().trim().min(1).max(300)).max(30),
    applications: z.array(z.string().trim().min(1).max(300)).max(30),
    specifications: z.record(z.string(), z.string().trim().max(300)),
    variants: z.array(variantSchema).max(1000).default([]),
    sortOrder: z.number().int().min(0).max(100000),
  })
  .refine(
    (data) =>
      data.compareAtPrice == null ||
      data.price == null ||
      data.compareAtPrice >= data.price,
    {
      message:
        "Original price must be equal to or greater than the selling price",
      path: ["compareAtPrice"],
    },
  )
  .refine(
    (data) =>
      !data.offerStartsAt ||
      !data.offerEndsAt ||
      data.offerStartsAt <= data.offerEndsAt,
    {
      message: "Offer end date must be on or after its start date",
      path: ["offerEndsAt"],
    },
  );

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get("partner-brands")
  async getPartnerBrands() {
    return (await this.productsService.getPublicPartnerBrands()).filter(
      (brand: { isActive?: boolean }) => brand.isActive !== false,
    );
  }

  @Get("catalogue/partner-brands")
  @UseGuards(StaffGuard)
  getAdminPartnerBrands() {
    return this.productsService.getPartnerBrands();
  }

  @Put("catalogue/partner-brands")
  @UseGuards(StaffGuard)
  savePartnerBrands(@Req() req: StaffRequest, @Body() body: unknown) {
    return this.productsService.savePartnerBrands(
      validate(partnerBrandsSchema, body),
      req.user.userId,
    );
  }

  @Get("categories")
  getPublicCatalogueCategories() {
    return this.productsService.getPublicCatalogueCategories();
  }

  @Get("catalogue/categories")
  @UseGuards(StaffGuard)
  getCatalogueCategories() {
    return this.productsService.getCatalogueCategories();
  }

  @Put("catalogue/categories")
  @UseGuards(StaffGuard)
  saveCatalogueCategories(@Req() req: StaffRequest, @Body() body: unknown) {
    return this.productsService.saveCatalogueCategories(validate(catalogueCategoriesSchema, body), req.user.userId);
  }

  @Get()
  getAllProducts(@Res({ passthrough: true }) response: Response) {
    // This endpoint contains public catalogue data only. A brief browser/CDN
    // cache makes hard reloads fast while keeping price and stock updates fresh.
    response.setHeader(
      "Cache-Control",
      "public, max-age=15, s-maxage=60, stale-while-revalidate=60",
    );
    response.removeHeader("Pragma");
    return this.productsService.findPublic();
  }

  @Get("brands")
  getBrands() {
    return this.productsService.getBrands();
  }

  @Get("brands/compare")
  getComparison() {
    return this.productsService.getBrandComparison();
  }

  @Get("inventory")
  @UseGuards(StaffGuard)
  inventory() {
    return this.productsService.findInventory();
  }

  @Get("catalogue/lookup")
  @UseGuards(StaffGuard)
  catalogueLookup(
    @Query("ids") idsInput?: string,
    @Query("includeDeleted") includeDeletedInput?: string,
  ) {
    const ids = validate(
      z.array(z.string().trim().min(1).max(100)).min(1).max(100),
      (idsInput || "").split(","),
    );
    const includeDeleted = validate(z.enum(["true", "false"]).optional(), includeDeletedInput) === "true";
    return this.productsService.findCatalogueByIds([...new Set(ids)], includeDeleted);
  }

  @Get("catalogue/matches")
  @UseGuards(StaffGuard)
  catalogueMatches(
    @Query("material") materialInput?: string,
    @Query("brand") brandInput?: string,
    @Query("unit") unitInput?: string,
    @Query("page") pageInput?: string,
    @Query("pageSize") pageSizeInput?: string,
  ) {
    const query = validate(z.object({
      material: z.string().trim().min(2).max(160),
      brand: z.string().trim().max(120).optional(),
      unit: z.string().trim().max(100).optional(),
    }), {
      material: materialInput,
      brand: brandInput,
      unit: unitInput,
    });
    const pagination = pageInput !== undefined || pageSizeInput !== undefined
      ? parsePagination(pageInput, pageSizeInput)
      : undefined;
    return this.productsService.findCatalogueMatches(
      query.material,
      query.brand,
      query.unit,
      pagination,
    );
  }

  @Get("catalogue")
  @UseGuards(StaffGuard)
  catalogue(
    @Query("page") pageInput?: string,
    @Query("pageSize") pageSizeInput?: string,
  ) {
    const pagination = pageInput !== undefined || pageSizeInput !== undefined
      ? parsePagination(pageInput, pageSizeInput)
      : undefined;
    return this.productsService.findCatalogue(pagination);
  }

  @Post("catalogue")
  @UseGuards(StaffGuard)
  createCatalogueProduct(@Req() req: StaffRequest, @Body() body: unknown) {
    return this.productsService.create(
      validate(listingSchema, body) as CatalogListingInput,
      req.user.userId,
    );
  }

  @Patch("catalogue/:id")
  @UseGuards(StaffGuard)
  updateCatalogueProduct(
    @Req() req: StaffRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.productsService.update(
      id,
      validate(listingSchema, body) as CatalogListingInput,
      req.user.userId,
    );
  }

  @Patch("catalogue/:id/unpublish")
  @UseGuards(StaffGuard)
  archiveCatalogueProduct(@Req() req: StaffRequest, @Param("id") id: string) {
    return this.productsService.archive(id, req.user.userId);
  }

  @Delete("catalogue/:id")
  @UseGuards(StaffGuard)
  deleteCatalogueProduct(@Req() req: StaffRequest, @Param("id") id: string) {
    return this.productsService.deleteToTrash(id, req.user.userId);
  }

  @Patch(":id/price")
  @UseGuards(StaffGuard)
  updatePrice(
    @Req() req: StaffRequest,
    @Param("id") id: string,
    @Body("basePricePerMt") price: number,
  ) {
    return this.productsService.updatePrice(
      id,
      validate(z.number().finite().nonnegative(), price),
      req.user.userId,
    );
  }
}

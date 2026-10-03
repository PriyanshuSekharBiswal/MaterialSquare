import { StaffGuard } from "../auth/access.guard";
import { validate } from "../common/validation";
import { z } from "zod";
import { Controller, Get, Patch, Param, Body, UseGuards, Post, Delete } from "@nestjs/common";
import { CatalogListingInput, ProductsService } from "./products.service";

const optionalText = z.string().trim().max(500).nullable().optional();
const optionalDate = z.string().date().nullable().optional().transform((value) =>
  value ? new Date(`${value}T00:00:00.000Z`) : null,
);
const listingSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  code: z.string().trim().max(80).nullable().optional(),
  name: z.string().trim().min(2).max(180),
  brand: z.string().trim().max(120).default(""),
  brandTagline: optionalText,
  category: z.string().trim().min(2).max(80),
  categoryLabel: z.string().trim().min(2).max(120),
  unit: z.string().trim().min(1).max(100),
  packaging: optionalText,
  image: z.string().trim().max(1000)
    .refine((value) => value.startsWith("/") && !value.startsWith("//") || /^https:\/\//i.test(value), "Use a site image path or an HTTPS image URL")
    .nullable().optional(),
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
  isPublished: z.boolean(),
  features: z.array(z.string().trim().min(1).max(300)).max(30),
  applications: z.array(z.string().trim().min(1).max(300)).max(30),
  specifications: z.record(z.string(), z.string().trim().max(300)),
  sortOrder: z.number().int().min(0).max(100000),
}).refine((data) => data.compareAtPrice == null || data.price == null || data.compareAtPrice >= data.price, {
  message: "Original price must be equal to or greater than the selling price",
  path: ["compareAtPrice"],
}).refine((data) => !data.offerStartsAt || !data.offerEndsAt || data.offerStartsAt <= data.offerEndsAt, {
  message: "Offer end date must be on or after its start date",
  path: ["offerEndsAt"],
});

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getAllProducts() {
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

  @Get("catalogue")
  @UseGuards(StaffGuard)
  catalogue() {
    return this.productsService.findCatalogue();
  }

  @Post("catalogue")
  @UseGuards(StaffGuard)
  createCatalogueProduct(@Body() body: unknown) {
    return this.productsService.create(validate(listingSchema, body) as CatalogListingInput);
  }

  @Patch("catalogue/:id")
  @UseGuards(StaffGuard)
  updateCatalogueProduct(@Param("id") id: string, @Body() body: unknown) {
    return this.productsService.update(id, validate(listingSchema, body) as CatalogListingInput);
  }

  @Delete("catalogue/:id")
  @UseGuards(StaffGuard)
  archiveCatalogueProduct(@Param("id") id: string) {
    return this.productsService.archive(id);
  }

  @Patch(":id/price")
  @UseGuards(StaffGuard)
  updatePrice(@Param("id") id: string, @Body("basePricePerMt") price: number) {
    return this.productsService.updatePrice(
      id,
      validate(z.number().finite().nonnegative(), price),
    );
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type CatalogListingInput = {
  slug: string;
  code?: string | null;
  name: string;
  brand: string;
  brandTagline?: string | null;
  category: string;
  categoryLabel: string;
  unit: string;
  packaging?: string | null;
  image?: string | null;
  galleryImages: string[];
  grade?: string | null;
  description?: string | null;
  minOrderQty?: string | null;
  dispatchTime?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  priceNote?: string | null;
  offerLabel?: string | null;
  offerStartsAt?: Date | null;
  offerEndsAt?: Date | null;
  isInStock: boolean;
  availabilityStatus?: "IN_STOCK" | "OUT_OF_STOCK" | "CHECK_AVAILABILITY";
  isPublished: boolean;
  features: string[];
  applications: string[];
  specifications: Record<string, string>;
  variants: Array<{
    code?: string | null;
    label: string;
    attributes: Record<string, string>;
    unit: string;
    price?: number | null;
    compareAtPrice?: number | null;
    priceNote?: string | null;
    offerLabel?: string | null;
    offerStartsAt?: Date | null;
    offerEndsAt?: Date | null;
    isInStock: boolean;
    availabilityStatus?: "IN_STOCK" | "OUT_OF_STOCK" | "CHECK_AVAILABILITY";
    stockQuantity?: number | null;
    minOrderQuantity?: number | null;
    quantityBreaks?: Array<{ minimumQuantity: number; unitPrice: number }>;
    sortOrder: number;
  }>;
  sortOrder: number;
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly initialPartnerBrands = [
    ["ultratech", "UltraTech Cement", "Cement", "The Engineer's Choice"],
    ["ambuja", "Ambuja Cement", "Cement", "Giant Compressive Strength"],
    ["jk-cement", "JK Cement", "Cement", "Build Safe & Strong"],
    ["shree-cement", "Shree Cement", "Cement", "Master Concrete Solution"],
    ["astral", "Astral Pipes", "Pipes", "CPVC Pro & Lead Free"],
    ["supreme", "Supreme Industries", "Pipes", "People who know plastics best"],
    ["finolex-pipes", "Finolex Pipes", "Pipes", "Pipes & Fittings"],
    ["zoloto", "Zoloto Valves", "Pipes", "Forged Brass & Bronze Valves"],
    ["polycab", "Polycab Wires", "Wires", "Wires & Cables"],
    ["havells", "Havells India", "Wires", "Wires That Never Catch Fire"],
    ["finolex-cables", "Finolex Cables Limited", "Wires", "Cables Limited"],
    ["asian-paints", "Asian Paints", "Paints", "Har Ghar Kuch Kehta Hai"],
    ["birla-opus", "Birla Opus Paints", "Paints", "Rich Colours, Superior Finish"],
    ["jaquar", "Jaquar Bath + Light", "Sanitary", "Bath + Light"],
    ["cera", "CERA Sanitaryware", "Sanitary", "Sanitaryware | Faucets | Tiles"],
    ["tata-tiscon", "Tata Tiscon", "Steel", "Desh Ka Saria"],
    ["myk-laticrete", "MYK Laticrete", "Adhesives", "World Leader in Tile Adhesives"],
  ].map(([id, name, category, tagline], sortOrder) => ({
    id, name, category, tagline, isActive: true, sortOrder,
  }));

  async getPartnerBrands() {
    const saved = await this.prisma.websiteContent.findUnique({ where: { id: "partner-brands" } });
    const content = saved?.content && typeof saved.content === "object" && !Array.isArray(saved.content)
      ? saved.content as Record<string, unknown>
      : {};
    const brands = content["brands.directory"];
    return Array.isArray(brands) ? brands : this.initialPartnerBrands;
  }

  async savePartnerBrands(brands: Array<{ id: string; name: string; category: string; tagline: string; isActive: boolean; sortOrder: number }>, staffId: string) {
    return this.prisma.$transaction(async (db) => {
      const previous = await db.websiteContent.findUnique({ where: { id: "partner-brands" } });
      const content = previous?.content && typeof previous.content === "object" && !Array.isArray(previous.content)
        ? previous.content as Record<string, unknown>
        : {};
      await db.websiteContent.upsert({
        where: { id: "partner-brands" },
        create: { id: "partner-brands", content: { ...content, "brands.directory": brands } },
        update: { content: { ...content, "brands.directory": brands } },
      });
      await db.auditLog.create({
        data: { staffId, action: "PARTNER_BRANDS_UPDATED", entityType: "WEBSITE_BRANDS", entityId: "partner-brands", metadata: { count: brands.length, active: brands.filter((brand) => brand.isActive).length } },
      });
      return brands;
    });
  }

  async findPublic() {
    const now = new Date();
    const indiaDateParts = new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const datePart = (type: Intl.DateTimeFormatPartTypes) =>
      indiaDateParts.find((part) => part.type === type)?.value || "";
    const todayInIndia = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
    const listings = await this.prisma.catalogListing.findMany({
      where: { isPublished: true },
      include: { variants: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return listings.map(
      ({
        specifications,
        isInStock,
        availabilityStatus,
        image,
        galleryImages,
        variants = [],
        ...listing
      }) => {
        const offerStart = listing.offerStartsAt?.toISOString().slice(0, 10);
        const offerEnd = listing.offerEndsAt?.toISOString().slice(0, 10);
        const offerActive =
          (!offerStart || offerStart <= todayInIndia) &&
          (!offerEnd || offerEnd >= todayInIndia);
        const variantStatuses = variants.map((variant) =>
          this.resolveAvailabilityStatus(variant.availabilityStatus, variant.isInStock),
        );
        const publicAvailability = isInStock || variantStatuses.includes("IN_STOCK")
          ? "IN_STOCK"
          : (availabilityStatus === "OUT_OF_STOCK" || (variantStatuses.length > 0 && variantStatuses.every((status) => status === "OUT_OF_STOCK")))
            ? "OUT_OF_STOCK"
            : "CHECK_AVAILABILITY";
        return {
          ...listing,
          availabilityStatus: publicAvailability,
          code: listing.code || listing.slug,
          brand: listing.brand || "",
          image: image || null,
          galleryImages: galleryImages.length
            ? galleryImages
            : image
              ? [image]
              : [],
          inStock: publicAvailability === "IN_STOCK",
          specs: specifications as Record<string, string>,
          wholesaleRate: listing.price == null ? "Request a quotation" : null,
          compareAtPrice: offerActive ? listing.compareAtPrice : null,
          offerLabel: offerActive ? listing.offerLabel : null,
          variants: variants.map(
            ({ isInStock: variantInStock, availabilityStatus: variantAvailability, ...variant }) => {
              const variantOfferStart =
                variant.offerStartsAt?.toISOString().slice(0, 10) || offerStart;
              const variantOfferEnd =
                variant.offerEndsAt?.toISOString().slice(0, 10) || offerEnd;
              const variantOfferActive =
                (!variantOfferStart || variantOfferStart <= todayInIndia) &&
                (!variantOfferEnd || variantOfferEnd >= todayInIndia);
              return {
                ...variant,
                inStock: this.resolveAvailabilityStatus(variantAvailability, variantInStock) === "IN_STOCK",
                availabilityStatus: this.resolveAvailabilityStatus(variantAvailability, variantInStock),
                attributes: variant.attributes as Record<string, string>,
                compareAtPrice: variantOfferActive
                  ? variant.compareAtPrice
                  : null,
                offerLabel: variantOfferActive ? variant.offerLabel : null,
              };
            },
          ),
        };
      },
    );
  }

  findCatalogue() {
    return this.prisma.catalogListing.findMany({
      include: { variants: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  findInventory() {
    return this.prisma.productSKU.findMany({
      include: { brand: true },
      orderBy: { name: "asc" },
    });
  }

  getBrands() {
    return this.prisma.brand.findMany({ orderBy: { name: "asc" } });
  }

  async getBrandComparison() {
    return (await this.getBrands()).map((brand) => ({
      brand: brand.name,
      spec: brand.complianceSpec,
      yieldStrength: brand.yieldStrengthMinMpa,
      elongation: brand.elongationMinPct,
      carbonEquiv: brand.carbonEquivMax,
    }));
  }

  async updatePrice(id: string, price: number, staffId: string) {
    return this.prisma.$transaction(async (db) => {
      const result = await db.productSKU.updateMany({
        where: { id },
        data: { basePricePerMt: price },
      });
      if (!result.count) throw new NotFoundException("Product not found");
      const product = await db.productSKU.findUnique({
        where: { id },
        include: { brand: true },
      });
      await db.auditLog.create({
        data: {
          staffId,
          action: "PRODUCT_PRICE_UPDATED",
          entityType: "PRODUCT_SKU",
          entityId: id,
          metadata: { fields: ["basePricePerMt"] },
        },
      });
      return product;
    });
  }

  async create(data: CatalogListingInput, staffId: string) {
    try {
      return await this.prisma.$transaction(async (db) => {
        const product = await db.catalogListing.create({
          data: {
            ...this.toPrismaData(data),
            variants: {
              create: data.variants.map((variant) =>
                this.toVariantPrismaData(variant),
              ),
            },
          },
        });
        await db.auditLog.create({
          data: {
            staffId,
            action: "CATALOG_PRODUCT_CREATED",
            entityType: "CATALOG_PRODUCT",
            entityId: product.id,
            metadata: {
              fields: Object.keys(data).sort(),
              variantCount: data.variants.length,
            },
          },
        });
        return product;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "That product code or URL name is already in use",
        );
      }
      throw error;
    }
  }

  async update(id: string, data: CatalogListingInput, staffId: string) {
    try {
      return await this.prisma.$transaction(async (db) => {
        const product = await db.catalogListing.update({
          where: { id },
          data: {
            ...this.toPrismaData(data),
            variants: {
              deleteMany: {},
              create: data.variants.map((variant) =>
                this.toVariantPrismaData(variant),
              ),
            },
          },
          include: { variants: { orderBy: { sortOrder: "asc" } } },
        });
        await db.auditLog.create({
          data: {
            staffId,
            action: "CATALOG_PRODUCT_UPDATED",
            entityType: "CATALOG_PRODUCT",
            entityId: product.id,
            metadata: {
              fields: Object.keys(data).sort(),
              variantCount: data.variants.length,
            },
          },
        });
        return product;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "That product code or URL name is already in use",
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException("Catalogue product not found");
      }
      throw error;
    }
  }

  async archive(id: string, staffId: string) {
    return this.prisma.$transaction(async (db) => {
      const result = await db.catalogListing.updateMany({
        where: { id },
        data: { isPublished: false },
      });
      if (!result.count)
        throw new NotFoundException("Catalogue product not found");
      await db.auditLog.create({
        data: {
          staffId,
          action: "CATALOG_PRODUCT_ARCHIVED",
          entityType: "CATALOG_PRODUCT",
          entityId: id,
          metadata: { fields: ["isPublished"] },
        },
      });
      return { success: true };
    });
  }

  private toPrismaData(
    data: CatalogListingInput,
  ): Prisma.CatalogListingUncheckedCreateInput {
    const { variants: _variants, ...listing } = data;
    const availabilityStatus = this.resolveAvailabilityStatus(data.availabilityStatus, data.isInStock);
    return {
      ...listing,
      isInStock: availabilityStatus === "IN_STOCK",
      availabilityStatus,
      code: data.code || null,
      brandTagline: data.brandTagline || null,
      packaging: data.packaging || null,
      image: data.image ?? null,
      grade: data.grade || null,
      description: data.description || null,
      minOrderQty: data.minOrderQty || null,
      dispatchTime: data.dispatchTime || null,
      price: data.price ?? null,
      compareAtPrice: data.compareAtPrice ?? null,
      priceNote: data.priceNote || null,
      offerLabel: data.offerLabel || null,
      offerStartsAt: data.offerStartsAt || null,
      offerEndsAt: data.offerEndsAt || null,
      specifications: data.specifications as Prisma.InputJsonValue,
      galleryImages: data.galleryImages,
    };
  }

  private toVariantPrismaData(
    variant: CatalogListingInput["variants"][number],
  ): Prisma.CatalogListingVariantUncheckedCreateWithoutListingInput {
    const availabilityStatus = this.resolveAvailabilityStatus(variant.availabilityStatus, variant.isInStock);
    return {
      code: variant.code || null,
      label: variant.label,
      attributes: variant.attributes as Prisma.InputJsonValue,
      unit: variant.unit,
      price: variant.price ?? null,
      compareAtPrice: variant.compareAtPrice ?? null,
      priceNote: variant.priceNote || null,
      offerLabel: variant.offerLabel || null,
      offerStartsAt: variant.offerStartsAt || null,
      offerEndsAt: variant.offerEndsAt || null,
      isInStock: availabilityStatus === "IN_STOCK",
      availabilityStatus,
      stockQuantity: variant.stockQuantity ?? null,
      minOrderQuantity: variant.minOrderQuantity ?? null,
      quantityBreaks: (variant.quantityBreaks || []) as Prisma.InputJsonValue,
      sortOrder: variant.sortOrder,
    };
  }

  private resolveAvailabilityStatus(
    status: "IN_STOCK" | "OUT_OF_STOCK" | "CHECK_AVAILABILITY" | undefined,
    legacyInStock: boolean,
  ): "IN_STOCK" | "OUT_OF_STOCK" | "CHECK_AVAILABILITY" {
    return status || (legacyInStock ? "IN_STOCK" : "CHECK_AVAILABILITY");
  }
}

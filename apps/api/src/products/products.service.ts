import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PRODUCTS } from "@material-square/types";
import { PrismaService } from "../prisma/prisma.service";
import { getDemoVariants } from "./catalog-demo-variants";
import { PREVIEW_CATALOG_LEGACY_SOURCE } from "./catalog-legacy-baseline";

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
  image: string;
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
    stockQuantity?: number | null;
    minOrderQuantity?: number | null;
    quantityBreaks?: Array<{ minimumQuantity: number; unitPrice: number }>;
    sortOrder: number;
  }>;
  sortOrder: number;
};

const categoryIllustrations: Record<string, string> = {
  cement: "/images/categories/cement-category.jpg",
  pipes: "/images/categories/pipes-category.jpg",
  wires: "/images/categories/wires-category.jpg",
  steel: "/images/categories/wires-category.jpg",
  paints: "/images/categories/paints-category.jpg",
  sanitary: "/images/categories/sanitary-category.jpg",
  adhesives: "/images/categories/pipes-category.jpg",
};
const previewGallery = (product: (typeof PRODUCTS)[number]) =>
  Array.from(
    new Set(
      [product.image, categoryIllustrations[product.category]].filter(
        (image): image is string => Boolean(image),
      ),
    ),
  );
const legacyPreviewById = new Map(
  PREVIEW_CATALOG_LEGACY_SOURCE.map((product) => [product.id, product]),
);
const stableJsonValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableJsonValue(item)]),
    );
  }
  return value ?? null;
};
const sameJson = (a: unknown, b: unknown) =>
  JSON.stringify(stableJsonValue(a)) === JSON.stringify(stableJsonValue(b));

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (
      process.env.APP_ENV === "production" ||
      (process.env.NODE_ENV === "production" && process.env.APP_ENV !== "demo")
    ) {
      this.logger.log("Skipping preview catalogue seed in production.");
      return;
    }
    // Seed the preview catalogue on first use. On an existing database add
    // only missing sample products/variants; never reset edits made by staff.
    let created = 0;
    let backfilled = 0;
    let existingCount = 0;
    const hidden = new Set<string>();
    for (const [sortOrder, product] of PRODUCTS.entries()) {
      const variants = getDemoVariants(product.id);
      const existing = await this.prisma.catalogListing.findUnique({
        where: { slug: product.id },
        include: { variants: true },
      });
      if (existing) {
        // The hosted preview database may contain early placeholder rows from
        // before the sample prices and category filters were completed. Keep
        // those sample rows useful for testing while only filling absent demo
        // fields; staff-entered prices, images and availability are preserved.
        // The exact slug lookup above identifies this preview family. Legacy
        // preview rows can have an empty or older product code, so do not let
        // that stale identifier prevent the additive price/category repair.
        if (existing.slug === product.id) {
          // Remove the old, unverified demo copy one field at a time. Each
          // field is replaced only when it still exactly matches the seeded
          // baseline; staff edits, prices, stock, images and publication state
          // are preserved.
          const legacy = legacyPreviewById.get(product.id);
          if (legacy) {
            const copyUpdate: Prisma.CatalogListingUpdateInput = {};
            if (existing.grade === legacy.grade)
              copyUpdate.grade = product.grade || null;
            if (existing.packaging === legacy.packaging)
              copyUpdate.packaging = product.packaging;
            if (existing.dispatchTime === legacy.dispatchTime)
              copyUpdate.dispatchTime = product.dispatchTime;
            if (existing.minOrderQty === legacy.minOrderQty)
              copyUpdate.minOrderQty = product.minOrderQty;
            if (sameJson(existing.features, legacy.features))
              copyUpdate.features = [...product.features];
            if (sameJson(existing.applications, legacy.applications))
              copyUpdate.applications = [...product.applications];
            if (sameJson(existing.specifications, legacy.specs))
              copyUpdate.specifications =
                product.specs as Prisma.InputJsonValue;
            if (
              existing.description ===
              "Preview catalogue item. Product details, price, tax and availability must be confirmed with the client before a sale."
            ) {
              copyUpdate.description = product.description;
            }
            if (Object.keys(copyUpdate).length) {
              await this.prisma.catalogListing.update({
                where: { id: existing.id },
                data: copyUpdate,
              });
              backfilled++;
            }
          }
          if (
            existing.category !== product.category ||
            existing.categoryLabel !== product.categoryLabel
          ) {
            await this.prisma.catalogListing.update({
              where: { id: existing.id },
              data: {
                category: product.category,
                categoryLabel: product.categoryLabel,
              },
            });
          }
          const variantsByCode = new Map(
            existing.variants.map((variant) => [variant.code, variant]),
          );
          const storedVariantsByOrder = existing.variants
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder);
          for (const seedVariant of variants) {
            const stored =
              variantsByCode.get(seedVariant.code) ||
              (existing.variants.length === variants.length
                ? storedVariantsByOrder[seedVariant.sortOrder]
                : undefined);
            if (!stored || stored.price != null || seedVariant.price == null)
              continue;
            await this.prisma.catalogListingVariant.update({
              where: { id: stored.id },
              data: {
                price: seedVariant.price,
                compareAtPrice: seedVariant.compareAtPrice ?? null,
                priceNote:
                  seedVariant.priceNote ||
                  "Indicative preview price; client must confirm current price, tax, stock and delivery.",
                quantityBreaks:
                  stored.quantityBreaks &&
                  JSON.stringify(stored.quantityBreaks) !== "[]"
                    ? undefined
                    : ((seedVariant.quantityBreaks ||
                        []) as Prisma.InputJsonValue),
              },
            });
            backfilled++;
          }
        }
        if (existing.variants.length === 0 && variants.length > 0) {
          try {
            await this.prisma.catalogListing.update({
              where: { id: existing.id },
              data: {
                galleryImages: existing.galleryImages.length
                  ? undefined
                  : previewGallery(product),
                variants: {
                  create: variants.map((variant) =>
                    this.toVariantPrismaData(variant),
                  ),
                },
              },
            });
            backfilled++;
          } catch (error) {
            if (
              !(error instanceof Prisma.PrismaClientKnownRequestError) ||
              error.code !== "P2002"
            )
              throw error;
          }
        } else {
          existingCount++;
          if (!existing.isPublished) hidden.add(product.id);
        }
        continue;
      }
      try {
        await this.prisma.catalogListing.create({
          data: {
            id: product.id,
            slug: product.id,
            code: product.code,
            name: product.name,
            brand: product.brand,
            brandTagline: product.brandTagline,
            category: product.category,
            categoryLabel: product.categoryLabel,
            unit: product.unit,
            packaging: product.packaging,
            image: product.image,
            galleryImages: previewGallery(product),
            minOrderQty: product.minOrderQty,
            dispatchTime: "Availability and delivery confirmed by staff",
            description: product.description,
            isInStock: false,
            isPublished: true,
            features: product.features,
            applications: product.applications,
            specifications: product.specs as Prisma.InputJsonValue,
            grade: product.grade || null,
            variants: {
              create: variants.map((variant) =>
                this.toVariantPrismaData(variant),
              ),
            },
            sortOrder,
          },
        });
        created++;
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2002"
        )
          throw error;
        this.logger.warn(
          `Preview catalogue seed skipped ${product.id}: a product or variant code already exists.`,
        );
      }
    }
    this.logger.log(
      `Preview catalogue seed checked ${PRODUCTS.length} families: ${created} created, ${backfilled} backfilled, ${existingCount} preserved.`,
    );
    if (hidden.size)
      this.logger.warn(
        `Preview catalogue families remain unpublished (preserved staff state): ${[...hidden].join(", ")}`,
      );

    // The first demo database used unpublished placeholder rows. Publish the
    // illustrative catalogue once so the public preview is usable, then keep
    // any later staff visibility changes across restarts. This marker is never
    // touched outside the isolated demo environment.
    if (process.env.APP_ENV === "demo") {
      const markerKey = "preview-catalogue-published-v1";
      const bootstrapped = await this.prisma.demoBootstrapState.findUnique({
        where: { key: markerKey },
      });
      if (!bootstrapped) {
        await this.prisma.catalogListing.updateMany({
          where: {
            slug: { in: PRODUCTS.map((product) => product.id) },
            isPublished: false,
          },
          data: { isPublished: true },
        });
        await this.prisma.demoBootstrapState.upsert({
          where: { key: markerKey },
          create: { key: markerKey },
          update: {},
        });
        this.logger.log(
          "Published the illustrative demo catalogue once; staff can now manage its visibility.",
        );
      }
    }
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
        return {
          ...listing,
          code: listing.code || listing.slug,
          brand: listing.brand || "",
          image: image || "/images/products/material-sack-illustration.png",
          galleryImages: galleryImages.length
            ? galleryImages
            : [image || "/images/products/material-sack-illustration.png"],
          inStock: isInStock || variants.some((variant) => variant.isInStock),
          specs: specifications as Record<string, string>,
          wholesaleRate: listing.price == null ? "Request a quotation" : null,
          compareAtPrice: offerActive ? listing.compareAtPrice : null,
          offerLabel: offerActive ? listing.offerLabel : null,
          variants: variants.map(
            ({ isInStock: variantInStock, ...variant }) => {
              const variantOfferStart =
                variant.offerStartsAt?.toISOString().slice(0, 10) || offerStart;
              const variantOfferEnd =
                variant.offerEndsAt?.toISOString().slice(0, 10) || offerEnd;
              const variantOfferActive =
                (!variantOfferStart || variantOfferStart <= todayInIndia) &&
                (!variantOfferEnd || variantOfferEnd >= todayInIndia);
              return {
                ...variant,
                inStock: variantInStock,
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
    return {
      ...listing,
      code: data.code || null,
      brandTagline: data.brandTagline || null,
      packaging: data.packaging || null,
      image: data.image,
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
      isInStock: variant.isInStock,
      stockQuantity: variant.stockQuantity ?? null,
      minOrderQuantity: variant.minOrderQuantity ?? null,
      quantityBreaks: (variant.quantityBreaks || []) as Prisma.InputJsonValue,
      sortOrder: variant.sortOrder,
    };
  }
}

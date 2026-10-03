import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PRODUCTS } from "@material-square/types";
import { PrismaService } from "../prisma/prisma.service";
import { getDemoVariants } from "./catalog-demo-variants";

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

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Seed the preview catalogue on first use. On an existing database add
    // only missing sample products/variants; never reset edits made by staff.
    for (const [sortOrder, product] of PRODUCTS.entries()) {
      const variants = getDemoVariants(product.id);
      const existing = await this.prisma.catalogListing.findUnique({
        where: { slug: product.id },
        include: { variants: true },
      });
      if (existing) {
        const untouchedInitialSeed =
          existing.name === product.name && existing.brand === product.brand &&
          existing.category === product.category && existing.image === product.image &&
          existing.price == null && existing.compareAtPrice == null && !existing.description &&
          !existing.isPublished && !existing.isInStock &&
          JSON.stringify(existing.features) === JSON.stringify(product.features) &&
          JSON.stringify(existing.applications) === JSON.stringify(product.applications) &&
          JSON.stringify(existing.specifications) === JSON.stringify(product.specs);
        if (existing.variants.length === 0 && variants.length > 0 && untouchedInitialSeed) {
          try {
            await this.prisma.catalogListing.update({
              where: { id: existing.id },
              data: {
                galleryImages: existing.galleryImages.length ? undefined : previewGallery(product),
                description: "Preview catalogue item. Confirm exact product details, price, tax, availability and delivery with staff.",
                dispatchTime: "Availability and delivery confirmed by staff",
                isPublished: true,
                features: [],
                applications: ["Confirm exact product and intended use with staff"],
                grade: null,
                specifications: {},
                variants: { create: variants.map((variant) => this.toVariantPrismaData(variant)) },
              },
            });
          } catch (error) {
            if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
          }
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
            description: "Preview catalogue item. Product details, price, tax and availability must be confirmed with the client before a sale.",
            isInStock: false,
            isPublished: true,
            features: [],
            applications: ["Confirm exact product and intended use with staff"],
            specifications: {},
            grade: null,
            variants: { create: variants.map((variant) => this.toVariantPrismaData(variant)) },
            sortOrder,
          },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
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
    return listings.map(({ specifications, isInStock, image, galleryImages, variants = [], ...listing }) => {
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
        galleryImages: galleryImages.length ? galleryImages : [image || "/images/products/material-sack-illustration.png"],
        inStock: isInStock || variants.some((variant) => variant.isInStock),
        specs: specifications as Record<string, string>,
        wholesaleRate: listing.price == null ? "Request a quotation" : null,
        compareAtPrice: offerActive ? listing.compareAtPrice : null,
        offerLabel: offerActive ? listing.offerLabel : null,
        variants: variants.map(({ isInStock: variantInStock, ...variant }) => {
          const variantOfferStart = variant.offerStartsAt?.toISOString().slice(0, 10) || offerStart;
          const variantOfferEnd = variant.offerEndsAt?.toISOString().slice(0, 10) || offerEnd;
          const variantOfferActive =
            (!variantOfferStart || variantOfferStart <= todayInIndia) &&
            (!variantOfferEnd || variantOfferEnd >= todayInIndia);
          return {
            ...variant,
            inStock: variantInStock,
            attributes: variant.attributes as Record<string, string>,
            compareAtPrice: variantOfferActive ? variant.compareAtPrice : null,
            offerLabel: variantOfferActive ? variant.offerLabel : null,
          };
        }),
      };
    });
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

  async updatePrice(id: string, price: number) {
    const result = await this.prisma.productSKU.updateMany({
      where: { id }, data: { basePricePerMt: price },
    });
    if (!result.count) throw new NotFoundException("Product not found");
    return this.prisma.productSKU.findUnique({ where: { id }, include: { brand: true } });
  }

  async create(data: CatalogListingInput) {
    try {
      return await this.prisma.catalogListing.create({
        data: {
          ...this.toPrismaData(data),
          variants: { create: data.variants.map((variant) => this.toVariantPrismaData(variant)) },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("That product code or URL name is already in use");
      }
      throw error;
    }
  }

  async update(id: string, data: CatalogListingInput) {
    try {
      return await this.prisma.catalogListing.update({
        where: { id },
        data: {
          ...this.toPrismaData(data),
          variants: {
            deleteMany: {},
            create: data.variants.map((variant) => this.toVariantPrismaData(variant)),
          },
        },
        include: { variants: { orderBy: { sortOrder: "asc" } } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("That product code or URL name is already in use");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("Catalogue product not found");
      }
      throw error;
    }
  }

  async archive(id: string) {
    const result = await this.prisma.catalogListing.updateMany({
      where: { id },
      data: { isPublished: false },
    });
    if (!result.count) throw new NotFoundException("Catalogue product not found");
    return { success: true };
  }

  private toPrismaData(data: CatalogListingInput): Prisma.CatalogListingUncheckedCreateInput {
    const { variants: _variants, ...listing } = data;
    return {
      ...listing,
      code: data.code || null,
      brandTagline: data.brandTagline || null,
      packaging: data.packaging || null,
      image: data.image || null,
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

  private toVariantPrismaData(variant: CatalogListingInput["variants"][number]): Prisma.CatalogListingVariantUncheckedCreateWithoutListingInput {
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
      sortOrder: variant.sortOrder,
    };
  }
}

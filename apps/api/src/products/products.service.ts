import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PRODUCTS } from "@material-square/types";
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
  sortOrder: number;
};

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Import the existing curated launch catalogue exactly once per database.
    // Later staff edits are never overwritten by an app restart.
    if (await this.prisma.catalogListing.count()) return;
    await this.prisma.catalogListing.createMany({
      data: PRODUCTS.map((product, sortOrder) => ({
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
        grade: product.grade,
        minOrderQty: product.minOrderQty,
        dispatchTime: product.dispatchTime,
        // Seed known product content for staff review, never assert stock or
        // publish unapproved catalogue facts into a new client database.
        isInStock: false,
        isPublished: false,
        features: [...product.features],
        applications: [...product.applications],
        specifications: product.specs as Prisma.InputJsonValue,
        sortOrder,
      })),
      skipDuplicates: true,
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
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return listings.map(({ specifications, isInStock, image, ...listing }) => {
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
        inStock: isInStock,
        specs: specifications as Record<string, string>,
        wholesaleRate: listing.price == null ? "Request a quotation" : null,
        compareAtPrice: offerActive ? listing.compareAtPrice : null,
        offerLabel: offerActive ? listing.offerLabel : null,
      };
    });
  }

  findCatalogue() {
    return this.prisma.catalogListing.findMany({
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
        data: this.toPrismaData(data),
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
      const result = await this.prisma.catalogListing.updateMany({
        where: { id },
        data: this.toPrismaData(data),
      });
      if (!result.count) throw new NotFoundException("Catalogue product not found");
      return this.prisma.catalogListing.findUniqueOrThrow({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("That product code or URL name is already in use");
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
    return {
      ...data,
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
    };
  }
}

import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "./products.service";

describe("customer catalogue", () => {
  it("keeps the full partner roster independent of published product inventory", async () => {
    const service = new ProductsService({
      websiteContent: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService);
    const brands = await service.getPartnerBrands();
    expect(brands).toHaveLength(17);
    expect(brands.map((brand: { name: string }) => brand.name)).toContain("UltraTech Cement");
    expect(brands.map((brand: { name: string }) => brand.name)).toContain("Asian Paints");
  });

  it("saves brand directory changes without replacing website copy and records an audit entry", async () => {
    const existingContent = { "home.title": "Welcome", "brands.directory": [] };
    const tx = {
      websiteContent: {
        findUnique: jest.fn().mockResolvedValue({ id: "partner-brands", content: existingContent }),
        upsert: jest.fn().mockResolvedValue(undefined),
      },
      auditLog: { create: jest.fn().mockResolvedValue(undefined) },
    };
    const service = new ProductsService({
      $transaction: (callback: (db: typeof tx) => unknown) => callback(tx),
    } as unknown as PrismaService);
    const brands = [{ id: "new-paints", name: "New Paints", category: "Paints", tagline: "", isActive: true, sortOrder: 17 }];
    await service.savePartnerBrands(brands, "staff-1");
    expect(tx.websiteContent.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { content: { ...existingContent, "brands.directory": brands } },
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ staffId: "staff-1", action: "PARTNER_BRANDS_UPDATED" }),
    }));
  });

  it("reads only client-published listings and preserves listings without images", async () => {
    const listings = [
      {
        id: "client-listing",
        slug: "client-listing",
        code: null,
        name: "Client paint range",
        brand: "Client brand",
        category: "paints",
        categoryLabel: "Paints",
        unit: "pack",
        image: null,
        galleryImages: [],
        specifications: { finish: "Matt" },
        isInStock: false,
        availabilityStatus: "OUT_OF_STOCK",
        variants: [],
        features: [],
        applications: [],
        price: null,
        compareAtPrice: null,
        offerLabel: null,
        offerStartsAt: null,
        offerEndsAt: null,
      },
    ];
    const prisma = {
      catalogListing: { findMany: jest.fn().mockResolvedValue(listings) },
    };
    const service = new ProductsService(prisma as unknown as PrismaService);

    const [product] = await service.findPublic();

    expect(prisma.catalogListing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isPublished: true } }),
    );
    expect(product).toMatchObject({
      id: "client-listing",
      code: "client-listing",
      brand: "Client brand",
      image: null,
      galleryImages: [],
      inStock: false,
      availabilityStatus: "OUT_OF_STOCK",
      specs: { finish: "Matt" },
    });
  });

  it("keeps variant availability explicit and summarizes the listing status", async () => {
    const listings = [
      {
        id: "all-out",
        slug: "all-out",
        name: "Paint range out of stock",
        brand: "Brand",
        category: "paints",
        categoryLabel: "Paints",
        unit: "tin",
        image: null,
        galleryImages: [],
        specifications: {},
        isInStock: false,
        availabilityStatus: "CHECK_AVAILABILITY",
        variants: [
          {
            id: "shade-one",
            label: "Shade 1",
            attributes: { colour: "Blue" },
            unit: "tin",
            isInStock: false,
            availabilityStatus: "OUT_OF_STOCK",
            sortOrder: 0,
          },
        ],
        features: [],
        applications: [],
        price: null,
        compareAtPrice: null,
      },
      {
        id: "some-in-stock",
        slug: "some-in-stock",
        name: "Paint range partly available",
        brand: "Brand",
        category: "paints",
        categoryLabel: "Paints",
        unit: "tin",
        image: null,
        galleryImages: [],
        specifications: {},
        isInStock: false,
        availabilityStatus: "CHECK_AVAILABILITY",
        variants: [
          {
            id: "shade-two",
            label: "Shade 2",
            attributes: { colour: "Red" },
            unit: "tin",
            isInStock: true,
            availabilityStatus: "IN_STOCK",
            sortOrder: 0,
          },
        ],
        features: [],
        applications: [],
        price: null,
        compareAtPrice: null,
      },
    ];
    const service = new ProductsService({
      catalogListing: { findMany: jest.fn().mockResolvedValue(listings) },
    } as unknown as PrismaService);

    const products = await service.findPublic();

    expect(products.map(({ availabilityStatus }) => availabilityStatus)).toEqual([
      "OUT_OF_STOCK",
      "IN_STOCK",
    ]);
    expect(products[0].variants[0]).toMatchObject({
      availabilityStatus: "OUT_OF_STOCK",
      inStock: false,
    });
    expect(products[1].variants[0]).toMatchObject({
      availabilityStatus: "IN_STOCK",
      inStock: true,
    });
  });

  it("does not create or change catalogue listings during service construction", () => {
    const prisma = {
      catalogListing: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    new ProductsService(prisma as unknown as PrismaService);

    expect(prisma.catalogListing.create).not.toHaveBeenCalled();
    expect(prisma.catalogListing.update).not.toHaveBeenCalled();
    expect(prisma.catalogListing.updateMany).not.toHaveBeenCalled();
  });
});

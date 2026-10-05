import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "./products.service";

describe("customer catalogue", () => {
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

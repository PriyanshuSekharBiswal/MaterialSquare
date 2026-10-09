import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "./products.service";

describe("customer catalogue", () => {
  it("keeps editable default brands available to the admin configuration", async () => {
    const service = new ProductsService({
      websiteContent: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService);
    const brands = await service.getPartnerBrands();
    expect(brands).toHaveLength(17);
    expect(brands.map((brand: { name: string }) => brand.name)).toContain(
      "UltraTech Cement",
    );
    expect(brands.map((brand: { name: string }) => brand.name)).toContain(
      "Asian Paints",
    );
  });

  it("publishes the default partner directory until the client customizes it", async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const service = new ProductsService({
      websiteContent: { findUnique },
    } as unknown as PrismaService);
    const brands = await service.getPublicPartnerBrands();
    expect(brands).toHaveLength(17);
    expect(brands.map((brand: { name: string }) => brand.name)).toContain(
      "UltraTech Cement",
    );
    expect(findUnique).toHaveBeenCalledWith({ where: { id: "partner-brands" } });
  });

  it("saves brand directory changes without replacing website copy and records an audit entry", async () => {
    const existingContent = { "home.title": "Welcome", "brands.directory": [] };
    const tx = {
      websiteContent: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: "partner-brands",
            content: existingContent,
          }),
        upsert: jest.fn().mockResolvedValue(undefined),
      },
      auditLog: { create: jest.fn().mockResolvedValue(undefined) },
    };
    const service = new ProductsService({
      $transaction: (callback: (db: typeof tx) => unknown) => callback(tx),
    } as unknown as PrismaService);
    const brands = [
      {
        id: "new-paints",
        name: "New Paints",
        category: "Paints",
        tagline: "",
        isActive: true,
        sortOrder: 17,
      },
    ];
    await service.savePartnerBrands(brands, "staff-1");
    expect(tx.websiteContent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { content: { ...existingContent, "brands.directory": brands } },
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          staffId: "staff-1",
          action: "PARTNER_BRANDS_UPDATED",
        }),
      }),
    );
  });

  it("records who changed product fields with before and after values", async () => {
    const before = {
      id: "product-1",
      slug: "old-name",
      code: "P-1",
      name: "Old name",
      brand: "Brand",
      brandTagline: null,
      category: "cement",
      categoryLabel: "Cement",
      unit: "bag",
      packaging: null,
      image: null,
      galleryImages: [],
      grade: null,
      description: null,
      minOrderQty: null,
      dispatchTime: null,
      price: 400,
      compareAtPrice: null,
      priceNote: null,
      offerLabel: null,
      offerStartsAt: null,
      offerEndsAt: null,
      isInStock: false,
      availabilityStatus: "CHECK_AVAILABILITY" as const,
      isPublished: false,
      features: [],
      applications: [],
      specifications: {},
      sortOrder: 0,
      variants: [],
    };
    const auditCreate = jest.fn().mockResolvedValue(undefined);
    const tx = {
      catalogListing: {
        findUnique: jest.fn().mockResolvedValue(before),
        update: jest
          .fn()
          .mockResolvedValue({ ...before, name: "New name", price: 450 }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ ...before, name: "New name", price: 450 }),
      },
      auditLog: { create: auditCreate },
    };
    const service = new ProductsService({
      $transaction: (callback: (db: typeof tx) => unknown) => callback(tx),
    } as unknown as PrismaService);
    const data = {
      slug: "new-name",
      code: "P-1",
      name: "New name",
      brand: "Brand",
      category: "cement",
      categoryLabel: "Cement",
      unit: "bag",
      galleryImages: [],
      price: 450,
      isInStock: false,
      availabilityStatus: "CHECK_AVAILABILITY" as const,
      isPublished: false,
      features: [],
      applications: [],
      specifications: {},
      variants: [],
      sortOrder: 0,
    };

    await service.update("product-1", data, "staff-editor");

    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          staffId: "staff-editor",
          action: "CATALOG_PRODUCT_UPDATED",
          metadata: expect.objectContaining({
            productName: "New name",
            changes: expect.arrayContaining([
              { field: "name", before: "Old name", after: "New name" },
              { field: "price", before: "400", after: "450" },
            ]),
          }),
        }),
      }),
    );
  });

  it("preserves sellable option IDs when publishing or editing a catalogue product", async () => {
    const variant = {
      id: "existing-variant-id",
      code: "CEMENT-50KG",
      label: "50 kg bag",
      attributes: { pack: "50 kg" },
      unit: "bag",
      image: null,
      galleryImages: [],
      price: null,
      compareAtPrice: null,
      priceNote: null,
      offerLabel: null,
      offerStartsAt: null,
      offerEndsAt: null,
      isInStock: true,
      availabilityStatus: "IN_STOCK" as const,
      stockQuantity: 300,
      minOrderQuantity: 1,
      quantityBreaks: [],
      sortOrder: 0,
    };
    const before = {
      id: "product-1",
      slug: "qa-cement",
      code: "QA-CEMENT",
      name: "QA cement",
      brand: "UltraTech Cement",
      brandTagline: null,
      category: "cement",
      categoryLabel: "Cement & Aggregates",
      unit: "bag",
      packaging: "50 kg bag",
      image: null,
      galleryImages: [],
      grade: null,
      description: null,
      minOrderQty: "1 bag",
      dispatchTime: null,
      price: null,
      compareAtPrice: null,
      priceNote: null,
      offerLabel: null,
      offerStartsAt: null,
      offerEndsAt: null,
      isInStock: true,
      availabilityStatus: "IN_STOCK" as const,
      isPublished: false,
      features: [],
      applications: [],
      specifications: {},
      sortOrder: 0,
      variants: [variant],
    };
    const updateVariant = jest.fn().mockResolvedValue(variant);
    const createVariant = jest.fn();
    const deleteVariants = jest.fn();
    const updatedProduct = { ...before, isPublished: true };
    const tx = {
      catalogListing: {
        findUnique: jest.fn().mockResolvedValue(before),
        update: jest.fn().mockResolvedValue(updatedProduct),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updatedProduct),
      },
      catalogListingVariant: {
        update: updateVariant,
        create: createVariant,
        deleteMany: deleteVariants,
      },
      auditLog: { create: jest.fn().mockResolvedValue(undefined) },
    };
    const service = new ProductsService({
      $transaction: (callback: (db: typeof tx) => unknown) => callback(tx),
    } as unknown as PrismaService);
    const data = {
      slug: before.slug,
      code: before.code,
      name: before.name,
      brand: before.brand,
      category: before.category,
      categoryLabel: before.categoryLabel,
      unit: before.unit,
      packaging: before.packaging,
      galleryImages: [],
      isInStock: true,
      availabilityStatus: "IN_STOCK" as const,
      isPublished: true,
      features: [],
      applications: [],
      specifications: {},
      variants: [variant],
      sortOrder: 0,
    };

    await service.update("product-1", data, "staff-editor");

    expect(updateVariant).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "existing-variant-id" } }),
    );
    expect(createVariant).not.toHaveBeenCalled();
    expect(deleteVariants).not.toHaveBeenCalled();
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

    expect(
      products.map(({ availabilityStatus }) => availabilityStatus),
    ).toEqual(["OUT_OF_STOCK", "IN_STOCK"]);
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

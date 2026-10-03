import { PRODUCTS } from "@material-square/types";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "./products.service";
import { getDemoVariants } from "./catalog-demo-variants";

describe("customer catalogue", () => {
  it("copies the preview catalogue with measurement and pricing variants into an empty database", async () => {
    const prisma = {
      catalogListing: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new ProductsService(prisma as unknown as PrismaService);

    await service.onModuleInit();

    expect(prisma.catalogListing.create).toHaveBeenCalledTimes(PRODUCTS.length);
    const seed = prisma.catalogListing.create.mock.calls.map((call) => call[0].data);
    expect(seed[0]).toMatchObject({ id: PRODUCTS[0].id, name: PRODUCTS[0].name, isPublished: true, isInStock: false });
    expect(seed[0].variants.create.length).toBeGreaterThan(0);
    expect(seed[0].variants.create[0]).toHaveProperty("price");
    expect(seed[0].variants.create[0].quantityBreaks).toEqual([
      { minimumQuantity: 10, unitPrice: 395 },
      { minimumQuantity: 30, unitPrice: 385 },
      { minimumQuantity: 50, unitPrice: 375 },
    ]);
    expect(seed.find((item) => item.id === "supreme-cpvc-quote-sample").variants.create[0]).toMatchObject({ price: 40.96, unit: "metre" });
  });

  it("does not reset staff catalogue edits during API restarts", async () => {
    const prisma = {
      catalogListing: {
        findUnique: jest.fn().mockResolvedValue({ id: "seeded", galleryImages: ["/image.png"], variants: [{ id: "existing" }] }),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const service = new ProductsService(prisma as unknown as PrismaService);

    await service.onModuleInit();

    expect(prisma.catalogListing.create).not.toHaveBeenCalled();
    expect(prisma.catalogListing.update).not.toHaveBeenCalled();
  });

  it("backfills missing preview prices and canonical sample categories without overwriting saved rates", async () => {
    const ultraTech = PRODUCTS.find((item) => item.id === "ultratech-super")!;
    const ultraTechVariant = {
      id: "ultratech-50kg", code: "legacy-ultratech-bag", price: null,
      quantityBreaks: [], sortOrder: 0,
    };
    const prisma = {
      catalogListing: {
        findUnique: jest.fn(({ where }: { where: { slug: string } }) => where.slug === ultraTech.id
          ? Promise.resolve({ id: ultraTech.id, slug: ultraTech.id, code: "legacy-product-code", category: "cement", categoryLabel: "Cement", galleryImages: [], variants: [ultraTechVariant] })
          : Promise.resolve(null)),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      catalogListingVariant: { update: jest.fn().mockResolvedValue({}) },
    };
    await new ProductsService(prisma as unknown as PrismaService).onModuleInit();

    expect(prisma.catalogListingVariant.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: ultraTechVariant.id },
      data: expect.objectContaining({ price: 405, compareAtPrice: 435, quantityBreaks: [
        { minimumQuantity: 10, unitPrice: 395 },
        { minimumQuantity: 30, unitPrice: 385 },
        { minimumQuantity: 50, unitPrice: 375 },
      ] }),
    }));
    expect(prisma.catalogListing.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: ultraTech.id },
      data: { category: "cement", categoryLabel: "Cement & Aggregates" },
    }));
  });

  it("adds sample measurement variants to an existing published preview item with no variants", async () => {
    const ultraTech = PRODUCTS.find((item) => item.id === "ultratech-super")!;
    const listing = {
      id: ultraTech.id, slug: ultraTech.id, code: "older-code", name: "Staff-edited cement",
      brand: "Staff brand", category: "cement", categoryLabel: "Cement & Aggregates",
      galleryImages: ["/staff-image.png"], description: "Staff description", isPublished: true,
      isInStock: true, variants: [],
    };
    const prisma = {
      catalogListing: {
        findUnique: jest.fn(({ where }: { where: { slug: string } }) => where.slug === ultraTech.id
          ? Promise.resolve(listing)
          : Promise.resolve(null)),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    await new ProductsService(prisma as unknown as PrismaService).onModuleInit();

    const update = prisma.catalogListing.update.mock.calls.find((call) => call[0].where.id === ultraTech.id)?.[0];
    expect(update?.data.variants.create).toHaveLength(getDemoVariants(ultraTech.id).length);
    expect(update?.data).not.toHaveProperty("description");
    expect(update?.data).not.toHaveProperty("isPublished");
    expect(update?.data).not.toHaveProperty("isInStock");
  });

  it("never seeds preview products into a production database", async () => {
    const previousAppEnv = process.env.APP_ENV;
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.APP_ENV = "production";
    process.env.NODE_ENV = "production";
    const prisma = {
      catalogListing: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    try {
      await new ProductsService(prisma as unknown as PrismaService).onModuleInit();
      expect(prisma.catalogListing.findUnique).not.toHaveBeenCalled();
      expect(prisma.catalogListing.create).not.toHaveBeenCalled();
    } finally {
      if (previousAppEnv === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = previousAppEnv;
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it("publishes only active catalogue products and includes staff-entered price and offer data", async () => {
    const prisma = {
      catalogListing: {
        findMany: jest.fn().mockResolvedValue([{
          id: "pipe-1", slug: "pipe-1", code: null, name: "CPVC pipe", brand: "Astral",
          category: "pipes", categoryLabel: "Pipes & Fittings", unit: "3 m length",
          image: null, specifications: { size: "25 mm" }, isInStock: true,
          galleryImages: [], variants: [],
          price: "340.00", compareAtPrice: "400.00", priceNote: "per length, GST extra",
          offerLabel: "Special price", offerStartsAt: null, offerEndsAt: null,
          features: [], applications: [],
        }]),
      },
    };
    const service = new ProductsService(prisma as unknown as PrismaService);

    const [product] = await service.findPublic();

    expect(prisma.catalogListing.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isPublished: true } }));
    expect(product).toMatchObject({
      id: "pipe-1", code: "pipe-1", inStock: true, image: "/images/products/material-sack-illustration.png",
      specs: { size: "25 mm" }, price: "340.00", compareAtPrice: "400.00",
      priceNote: "per length, GST extra", offerLabel: "Special price",
    });
  });

  it("hides a comparison price and offer label outside the scheduled offer dates", async () => {
    const prisma = {
      catalogListing: {
        findMany: jest.fn().mockResolvedValue([{
          id: "pipe-1", slug: "pipe-1", name: "CPVC pipe", category: "pipes",
          categoryLabel: "Pipes & Fittings", unit: "3 m length", specifications: {},
          galleryImages: [], variants: [],
          isInStock: true, price: "340.00", compareAtPrice: "400.00",
          offerLabel: "Special price", offerStartsAt: null,
          offerEndsAt: new Date("2020-01-01T00:00:00.000Z"),
        }]),
      },
    };
    const service = new ProductsService(prisma as unknown as PrismaService);

    const [product] = await service.findPublic();

    expect(product.price).toBe("340.00");
    expect(product.compareAtPrice).toBeNull();
    expect(product.offerLabel).toBeNull();
  });

  it("returns sellable variants with exact units, gallery images, and variant-level availability", async () => {
    const prisma = {
      catalogListing: {
        findMany: jest.fn().mockResolvedValue([{
          id: "paint", slug: "paint", name: "Interior paint", category: "paints",
          categoryLabel: "Paints", unit: "pack", specifications: {}, image: "/paint.png",
          galleryImages: ["/paint.png", "/room.png"], isInStock: false,
          variants: [{ id: "paint-4l", code: null, label: "4 L · Base White", attributes: { volume: "4 L", shade: "Base White" }, unit: "4 L tin", price: "724.00", compareAtPrice: "953.00", priceNote: "Confirm shade price", offerLabel: "Demo offer", offerStartsAt: null, offerEndsAt: null, isInStock: true, stockQuantity: "4.000", minOrderQuantity: null, quantityBreaks: [{ minimumQuantity: 10, unitPrice: 700 }], sortOrder: 0 }],
        }]),
      },
    };
    const service = new ProductsService(prisma as unknown as PrismaService);

    const [product] = await service.findPublic();

    expect(product).toMatchObject({
      inStock: true,
      galleryImages: ["/paint.png", "/room.png"],
      variants: [{ id: "paint-4l", label: "4 L · Base White", unit: "4 L tin", price: "724.00", compareAtPrice: "953.00", inStock: true, attributes: { volume: "4 L", shade: "Base White" }, quantityBreaks: [{ minimumQuantity: 10, unitPrice: 700 }] }],
    });
  });

  it("keeps an offer active through its final date in India and expires it the next day", async () => {
    const prisma = {
      catalogListing: {
        findMany: jest.fn().mockResolvedValue([{
          id: "pipe-1", slug: "pipe-1", name: "CPVC pipe", category: "pipes",
          categoryLabel: "Pipes & Fittings", unit: "3 m length", specifications: {},
          galleryImages: [], variants: [],
          isInStock: true, price: "340.00", compareAtPrice: "400.00",
          offerLabel: "Special price", offerStartsAt: null,
          offerEndsAt: new Date("2026-10-03T00:00:00.000Z"),
        }]),
      },
    };
    const service = new ProductsService(prisma as unknown as PrismaService);

    jest.useFakeTimers().setSystemTime(new Date("2026-10-03T18:00:00.000Z"));
    try {
      const [throughLastDate] = await service.findPublic();
      expect(throughLastDate.offerLabel).toBe("Special price");

      jest.setSystemTime(new Date("2026-10-03T19:00:00.000Z"));
      const [afterLastDate] = await service.findPublic();
      expect(afterLastDate.offerLabel).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

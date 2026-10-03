import { PRODUCTS } from "@material-square/types";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "./products.service";

describe("customer catalogue", () => {
  it("copies the catalogue into an empty database as unpublished, unavailable drafts without inventing rates", async () => {
    const prisma = {
      catalogListing: {
        count: jest.fn().mockResolvedValue(0),
        createMany: jest.fn().mockResolvedValue({ count: PRODUCTS.length }),
      },
    };
    const service = new ProductsService(prisma as unknown as PrismaService);

    await service.onModuleInit();

    const seed = prisma.catalogListing.createMany.mock.calls[0][0].data;
    expect(seed).toHaveLength(PRODUCTS.length);
    expect(seed[0]).toMatchObject({
      id: PRODUCTS[0].id,
      name: PRODUCTS[0].name,
      isPublished: false,
      isInStock: false,
    });
    expect(seed[0]).not.toHaveProperty("price");
    expect(seed[0]).not.toHaveProperty("compareAtPrice");
  });

  it("does not reset staff catalogue edits during API restarts", async () => {
    const prisma = {
      catalogListing: {
        count: jest.fn().mockResolvedValue(18),
        createMany: jest.fn(),
      },
    };
    const service = new ProductsService(prisma as unknown as PrismaService);

    await service.onModuleInit();

    expect(prisma.catalogListing.createMany).not.toHaveBeenCalled();
  });

  it("publishes only active catalogue products and includes staff-entered price and offer data", async () => {
    const prisma = {
      catalogListing: {
        findMany: jest.fn().mockResolvedValue([{
          id: "pipe-1", slug: "pipe-1", code: null, name: "CPVC pipe", brand: "Astral",
          category: "pipes", categoryLabel: "Pipes & Fittings", unit: "3 m length",
          image: null, specifications: { size: "25 mm" }, isInStock: true,
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

  it("keeps an offer active through its final date in India and expires it the next day", async () => {
    const prisma = {
      catalogListing: {
        findMany: jest.fn().mockResolvedValue([{
          id: "pipe-1", slug: "pipe-1", name: "CPVC pipe", category: "pipes",
          categoryLabel: "Pipes & Fittings", unit: "3 m length", specifications: {},
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

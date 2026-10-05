import { MediaAssetsService } from "./media-assets.service";

describe("MediaAssetsService", () => {
  const url = "https://cdn.example.test/images/product.webp";
  const media = {
    id: "asset-1",
    key: "images/product.webp",
    url,
    originalName: "product.webp",
    mimeType: "image/webp",
    byteSize: 1024,
    createdAt: new Date("2026-10-04T12:00:00Z"),
  };

  it("shows references across product, blog, expert and website content", async () => {
    const prisma = {
      mediaAsset: {
        findMany: jest.fn().mockResolvedValue([media]),
        count: jest.fn().mockResolvedValue(1),
      },
      catalogListing: {
        findMany: jest.fn().mockResolvedValue([
          {
            name: "Cement",
            slug: "cement",
            image: url,
            galleryImages: [url],
          },
        ]),
      },
      blogPost: {
        findMany: jest.fn().mockResolvedValue([
          {
            title: "Choosing cement",
            slug: "choosing-cement",
            featuredImageUrl: url,
            status: "PUBLISHED",
          },
        ]),
      },
      expertAdvisor: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { name: "Site advisor", imageUrl: url, isPublished: false },
          ]),
      },
      websiteContent: {
        findMany: jest.fn().mockResolvedValue([
          { id: "global", content: { "home.heroImage": url } },
          { id: "draft", content: { sections: [{ image: url }] } },
        ]),
      },
    };
    const service = new MediaAssetsService(prisma as never);

    const result = await service.list({ page: 1, search: "" });

    expect(result.items[0].usage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "Product", location: "Primary image" }),
        expect.objectContaining({ type: "Product", location: "Gallery image" }),
        expect.objectContaining({
          type: "Blog post",
          location: "published · /blogs/choosing-cement",
        }),
        expect.objectContaining({
          type: "Expert profile",
          location: "Draft profile",
        }),
        expect.objectContaining({
          type: "Website content",
          label: "Published website",
          location: "home.heroImage",
        }),
        expect.objectContaining({
          type: "Website content",
          label: "Website draft",
          location: "sections.0.image",
        }),
      ]),
    );
  });

  it("does not scan content tables when the current page has no assets", async () => {
    const prisma = {
      mediaAsset: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      catalogListing: { findMany: jest.fn() },
      blogPost: { findMany: jest.fn() },
      expertAdvisor: { findMany: jest.fn() },
      websiteContent: { findMany: jest.fn() },
    };
    const service = new MediaAssetsService(prisma as never);

    await expect(
      service.list({ page: 1, search: "missing" }),
    ).resolves.toMatchObject({
      items: [],
      total: 0,
    });
    expect(prisma.catalogListing.findMany).not.toHaveBeenCalled();
  });
});

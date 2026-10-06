import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const MEDIA_PAGE_SIZE = 24;

export type MediaSearch = {
  page: number;
  search: string;
};

export type UploadedMedia = {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  staffId?: string;
};
export type MediaUsage = {
  type: "Product" | "Blog post" | "Expert profile" | "Website content";
  label: string;
  location: string;
};

@Injectable()
export class MediaAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ page, search }: MediaSearch) {
    const where = search
      ? {
          OR: [
            {
              originalName: { contains: search, mode: "insensitive" as const },
            },
            { key: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * MEDIA_PAGE_SIZE,
        take: MEDIA_PAGE_SIZE,
        select: {
          id: true,
          key: true,
          url: true,
          originalName: true,
          mimeType: true,
          byteSize: true,
          createdAt: true,
        },
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);
    const usageByUrl = await this.findUsage(items.map(({ url }) => url));
    return {
      items: items.map((item) => ({
        ...item,
        usage: usageByUrl.get(item.url) || [],
      })),
      page,
      pageSize: MEDIA_PAGE_SIZE,
      total,
    };
  }

  private async findUsage(urls: string[]) {
    const usageByUrl = new Map<string, MediaUsage[]>(
      urls.map((url) => [url, []]),
    );
    if (!urls.length) return usageByUrl;

    const [products, posts, experts, websiteContent] = await Promise.all([
      this.prisma.catalogListing.findMany({
        where: {
          OR: [{ image: { in: urls } }, { galleryImages: { hasSome: urls } }],
        },
        select: { name: true, slug: true, image: true, galleryImages: true },
      }),
      this.prisma.blogPost.findMany({
        where: { featuredImageUrl: { in: urls } },
        select: {
          title: true,
          slug: true,
          featuredImageUrl: true,
          status: true,
        },
      }),
      this.prisma.expertAdvisor.findMany({
        where: { imageUrl: { in: urls } },
        select: { name: true, imageUrl: true, isPublished: true },
      }),
      this.prisma.websiteContent.findMany({
        where: { id: { in: ["global", "draft"] } },
        select: { id: true, content: true },
      }),
    ]);
    const add = (url: string | null, usage: MediaUsage) => {
      if (url && usageByUrl.has(url)) usageByUrl.get(url)!.push(usage);
    };

    for (const product of products) {
      add(product.image, {
        type: "Product",
        label: product.name,
        location: "Primary image",
      });
      for (const image of product.galleryImages)
        add(image, {
          type: "Product",
          label: product.name,
          location: "Gallery image",
        });
    }
    for (const post of posts)
      add(post.featuredImageUrl, {
        type: "Blog post",
        label: post.title,
        location: `${post.status.toLowerCase()} · /blogs/${post.slug}`,
      });
    for (const expert of experts)
      add(expert.imageUrl, {
        type: "Expert profile",
        label: expert.name,
        location: expert.isPublished ? "Published profile" : "Draft profile",
      });

    const visit = (value: unknown, id: string, path: string[]) => {
      if (typeof value === "string") {
        add(value, {
          type: "Website content",
          label: id === "global" ? "Published website" : "Website draft",
          location: path.join("."),
        });
      } else if (Array.isArray(value)) {
        value.forEach((child, index) =>
          visit(child, id, [...path, String(index)]),
        );
      } else if (value && typeof value === "object") {
        Object.entries(value).forEach(([key, child]) =>
          visit(child, id, [...path, key]),
        );
      }
    };
    for (const page of websiteContent) visit(page.content, page.id, []);
    return usageByUrl;
  }

  async recordUploadedAsset(asset: UploadedMedia) {
    return this.prisma.$transaction(async (db) => {
      const saved = await db.mediaAsset.create({
        data: {
          key: asset.key,
          url: asset.url,
          originalName: asset.originalName.slice(0, 255),
          mimeType: asset.mimeType,
          byteSize: asset.byteSize,
          uploadedById: asset.staffId,
        },
      });
      await db.auditLog.create({
        data: {
          staffId: asset.staffId,
          action: "MEDIA_ASSET_UPLOADED",
          entityType: "MEDIA_ASSET",
          entityId: saved.id,
          metadata: {
            key: saved.key,
            originalName: saved.originalName,
            mimeType: saved.mimeType,
            byteSize: saved.byteSize,
          },
        },
      });
      return { id: saved.id, key: saved.key, url: saved.url };
    });
  }
}

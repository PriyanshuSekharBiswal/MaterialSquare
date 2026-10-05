import type { StaffRequest } from "../auth/staff-request";
import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Header,
  Put,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { SITE_CONTENT_DEFAULTS } from "@material-square/types";
import { SITE_CONTENT_KEYS, SiteContentSchema } from "./site-content.schema";
import { StaffGuard } from "../auth/access.guard";
import { validate } from "../common/validation";
import { PrismaService } from "../prisma/prisma.service";

@Controller("site-content")
export class PublicSiteContentController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    const saved = await this.prisma.websiteContent.findUnique({
      where: { id: "global" },
    });
    const content =
      saved?.content &&
      typeof saved.content === "object" &&
      !Array.isArray(saved.content)
        ? (saved.content as Record<string, unknown>)
        : {};
    return Object.fromEntries(
      SITE_CONTENT_KEYS.map((key) => [
        key,
        typeof content[key] === "string"
          ? content[key]
          : SITE_CONTENT_DEFAULTS[key],
      ]),
    );
  }

  @Get("sitemap.xml")
  @Header("Content-Type", "application/xml; charset=utf-8")
  @Header("Cache-Control", "public, max-age=300, s-maxage=300")
  async sitemap(@Query("origin") requestedOrigin?: string) {
    const value =
      requestedOrigin?.trim() || process.env.PUBLIC_SITE_URL?.trim();
    let origin: string;
    try {
      const url = new URL(value || "");
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash
      )
        throw new Error("Invalid site origin");
      origin = url.origin;
    } catch {
      throw new BadRequestException(
        "Provide the customer website HTTPS origin for its sitemap",
      );
    }

    const publishedArticles = await this.prisma.blogPost.findMany({
      where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, updatedAt: true },
    });
    const staticPaths = [
      "/",
      "/marketplace",
      "/why-us",
      "/guides",
      "/get-quote",
      "/contact",
      "/blogs",
      "/experts",
      "/privacy",
      "/terms",
    ];
    const urls = [
      ...staticPaths.map((path) => ({
        loc: `${origin}${path === "/" ? "/" : path}`,
        lastmod: undefined,
      })),
      ...publishedArticles.map(({ slug, updatedAt }) => ({
        loc: `${origin}/blogs/${encodeURIComponent(slug)}`,
        lastmod: updatedAt,
      })),
    ]
      .map(({ loc, lastmod }) =>
        [
          "  <url>",
          `    <loc>${escapeXml(loc)}</loc>`,
          ...(lastmod
            ? [`    <lastmod>${lastmod.toISOString()}</lastmod>`]
            : []),
          "  </url>",
        ].join("\n"),
      )
      .join("\n");
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      urls,
      "</urlset>",
    ].join("\n");
  }
}

function escapeXml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

@Controller("admin/site-content")
@UseGuards(StaffGuard)
export class AdminSiteContentController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    return new PublicSiteContentController(this.prisma).get();
  }

  @Get("draft")
  async draft() {
    const saved = await this.prisma.websiteContent.findUnique({
      where: { id: "draft" },
    });
    return {
      ...(await this.get()),
      ...((saved?.content as Record<string, string>) || {}),
    };
  }

  @Put("draft")
  async saveDraft(@Body() body: unknown, @Req() req?: StaffRequest) {
    const content = validate(SiteContentSchema, body);
    await this.prisma.$transaction(async (db) => {
      const previous = await db.websiteContent.findUnique({
        where: { id: "draft" },
      });
      const previousContent = (previous?.content || {}) as Record<
        string,
        unknown
      >;
      const changedFields = SITE_CONTENT_KEYS.filter(
        (key) =>
          content[key] !== (previousContent[key] ?? SITE_CONTENT_DEFAULTS[key]),
      );
      await db.websiteContent.upsert({
        where: { id: "draft" },
        create: { id: "draft", content: content as Prisma.InputJsonObject },
        update: { content: content as Prisma.InputJsonObject },
      });
      await db.auditLog.create({
        data: {
          staffId: req?.user.userId,
          action: "WEBSITE_CONTENT_DRAFT_SAVED",
          entityType: "WEBSITE_CONTENT",
          entityId: "draft",
          metadata: { changedFields },
        },
      });
    });
    return content;
  }

  @Post("publish")
  async publish(@Body() body: unknown, @Req() req?: StaffRequest) {
    return this.save(body, req);
  }

  @Put()
  async save(@Body() body: unknown, @Req() req?: StaffRequest) {
    const content = validate(SiteContentSchema, body);
    await this.prisma.$transaction(async (db) => {
      const previous = await db.websiteContent.findUnique({
        where: { id: "global" },
      });
      const previousContent = (previous?.content || {}) as Record<
        string,
        unknown
      >;
      const changedFields = SITE_CONTENT_KEYS.filter(
        (key) =>
          content[key] !== (previousContent[key] ?? SITE_CONTENT_DEFAULTS[key]),
      );
      await db.websiteContent.upsert({
        where: { id: "global" },
        create: { id: "global", content: content as Prisma.InputJsonObject },
        update: { content: content as Prisma.InputJsonObject },
      });
      await db.auditLog.create({
        data: {
          staffId: req?.user.userId,
          action: "WEBSITE_CONTENT_PUBLISHED",
          entityType: "WEBSITE_CONTENT",
          entityId: "global",
          metadata: { changedFields },
        },
      });
    });
    return content;
  }
}

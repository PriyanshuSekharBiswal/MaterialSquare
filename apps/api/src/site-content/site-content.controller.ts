import type { StaffRequest } from "../auth/staff-request";
import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Header,
  Put,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { websitePages, sanitizePublicSiteContent, SITE_CONTENT_DEFAULTS } from "@material-square/types";
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
    const safe = sanitizePublicSiteContent(content);
    safe["website.pages"] = JSON.stringify(websitePages(safe["website.pages"]).filter(page => page.published));
    return safe;
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
      "/locations/noida",
      "/locations/greater-noida",
      "/locations/delhi",
      "/locations/gurugram",
      "/locations/ghaziabad",
      "/locations/faridabad",
      "/privacy",
      "/terms",
    ];
    const savedPages = await this.prisma.websiteContent.findUnique({ where: { id: "global" } });
    const managedPages = websitePages((savedPages?.content as Record<string, string> | undefined)?.["website.pages"] || "[]").filter(page => page.published);
    const urls = [
      ...managedPages.map(page => ({ loc: `${origin}${page.path}`, lastmod: undefined })),
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

function auditChanges(
  keys: string[],
  before: Record<string, unknown>,
  after: Record<string, string>,
) {
  return keys.map((field) => ({
    field,
    before: String(before[field] ?? (SITE_CONTENT_DEFAULTS as Record<string, string>)[field] ?? "").slice(0, 240),
    after: String(after[field] ?? "").slice(0, 240),
  }));
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

  @Get("draft/status")
  async draftStatus() {
    const saved = await this.prisma.websiteContent.findUnique({ where: { id: "draft" } });
    return { updatedAt: saved?.updatedAt || null };
  }

  @Get("draft/history")
  async draftHistory() {
    const now = new Date();
    await this.prisma.websiteContentRevision.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    return this.prisma.websiteContentRevision.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        changedFields: true,
        saveType: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        staff: { select: { name: true, role: true } },
      },
    });
  }

  @Post("draft/restore/:id")
  async restoreDraft(@Param("id") id: string, @Req() req?: StaffRequest) {
    const revision = await this.prisma.websiteContentRevision.findFirst({
      where: { id, expiresAt: { gt: new Date() } },
    });
    if (!revision) throw new BadRequestException("This recovery point has expired.");
    return this.saveDraft(revision.content, req, "manual");
  }

  @Put("draft")
  async saveDraft(
    @Body() body: unknown,
    @Req() req?: StaffRequest,
    @Query("mode") mode = "manual",
  ) {
    if (mode !== "manual" && mode !== "autosave")
      throw new BadRequestException("Draft save mode is invalid.");
    const content = validate(SiteContentSchema, body);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.$transaction(async (db) => {
      await db.websiteContentRevision.deleteMany({
        where: { expiresAt: { lte: now } },
      });
      const previous = await db.websiteContent.findUnique({
        where: { id: "draft" },
      });
      const published = previous ? null : await db.websiteContent.findUnique({
        where: { id: "global" },
      });
      const previousContent = (previous?.content || published?.content || {}) as Record<
        string,
        unknown
      >;
      const changedFields = SITE_CONTENT_KEYS.filter(
        (key) =>
          content[key] !== (previousContent[key] ?? SITE_CONTENT_DEFAULTS[key]),
      );
      if (changedFields.length === 0) return;
      await db.websiteContent.upsert({
        where: { id: "draft" },
        create: { id: "draft", content: content as Prisma.InputJsonObject },
        update: { content: content as Prisma.InputJsonObject },
      });
      const priorRevision = mode === "autosave"
        ? await db.websiteContentRevision.findFirst({
            where: {
              saveType: "AUTOSAVE",
              staffId: req?.user.userId || null,
              updatedAt: { gte: new Date(now.getTime() - 15 * 60_000) },
            },
            orderBy: { updatedAt: "desc" },
          })
        : null;
      const priorFields = Array.isArray(priorRevision?.changedFields)
        ? priorRevision.changedFields.filter((field): field is string => typeof field === "string")
        : [];
      if (priorRevision) {
        await db.websiteContentRevision.update({
          where: { id: priorRevision.id },
          data: {
            content: content as Prisma.InputJsonObject,
            changedFields: [...new Set([...priorFields, ...changedFields])],
            expiresAt,
          },
        });
      } else {
        await db.websiteContentRevision.create({
          data: {
            staffId: req?.user.userId,
            content: content as Prisma.InputJsonObject,
            changedFields,
            saveType: mode === "autosave" ? "AUTOSAVE" : "MANUAL",
            expiresAt,
          },
        });
      }
      if (mode === "manual") {
        await db.auditLog.create({
          data: {
            staffId: req?.user.userId,
            action: "WEBSITE_CONTENT_DRAFT_SAVED",
            entityType: "WEBSITE_CONTENT",
            entityId: "draft",
            metadata: {
              changedFields,
              changes: auditChanges(changedFields, previousContent, content),
            },
          },
        });
      }
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
          metadata: {
            changedFields,
            changes: auditChanges(changedFields, previousContent, content),
          },
        },
      });
    });
    return content;
  }
}

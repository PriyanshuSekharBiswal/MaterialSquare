import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { StaffGuard } from "../../auth/access.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { validate } from "../../common/validation";
import type { StaffRequest } from "../../auth/staff-request";

@Controller("admin/blogs")
@UseGuards(StaffGuard)
export class BlogManagementController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list() {
    return this.prisma.blogPost.findMany({ orderBy: { updatedAt: "desc" } });
  }
  @Post()
  create(@Req() req: StaffRequest, @Body() body: unknown) {
    const data = validate(
      z.object({
        title: z.string().trim().min(3).max(200),
        slug: z
          .string()
          .trim()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .max(220),
        summary: z.string().trim().min(10).max(500),
        body: z.string().trim().min(20).max(50000),
        featuredImageUrl: z.string().url().nullable().optional(),
        status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
        authorName: z.string().max(150).optional(),
      }),
      body,
    );
    return this.prisma.$transaction(async (tx) => {
      const article = await tx.blogPost.create({
        data: {
          ...data,
          publishedAt: data.status === "PUBLISHED" ? new Date() : null,
        },
      });
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action:
            data.status === "PUBLISHED" ? "BLOG_PUBLISHED" : "BLOG_CREATED",
          entityType: "BLOG_POST",
          entityId: article.id,
          metadata: { fields: Object.keys(data).sort(), status: data.status },
        },
      });
      return article;
    });
  }
  @Patch(":id")
  async update(
    @Req() req: StaffRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const data = validate(
      z.object({
        title: z.string().trim().min(3).max(200).optional(),
        slug: z
          .string()
          .trim()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .max(220)
          .optional(),
        summary: z.string().trim().min(10).max(500).optional(),
        body: z.string().trim().min(20).max(50000).optional(),
        featuredImageUrl: z.string().url().nullable().optional(),
        status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
        authorName: z.string().max(150).nullable().optional(),
      }),
      body,
    );
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.blogPost.findUnique({ where: { id } });
      if (!previous) throw new NotFoundException("Article not found");
      const article = await tx.blogPost.update({
        where: { id },
        data: {
          ...data,
          publishedAt:
            data.status === "PUBLISHED"
              ? previous.publishedAt || new Date()
              : data.status
                ? null
                : undefined,
        },
      });
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action:
            data.status === "PUBLISHED" ? "BLOG_PUBLISHED" : "BLOG_UPDATED",
          entityType: "BLOG_POST",
          entityId: article.id,
          metadata: {
            fields: Object.keys(data).sort(),
            status: article.status,
          },
        },
      });
      return article;
    });
  }
  @Delete(":id")
  async archive(@Req() req: StaffRequest, @Param("id") id: string) {
    return this.prisma.$transaction(async (tx) => {
      const article = await tx.blogPost
        .update({
          where: { id },
          data: { status: "ARCHIVED", publishedAt: null },
        })
        .catch((error) => {
          if (error?.code === "P2025")
            throw new NotFoundException("Article not found");
          throw error;
        });
      await tx.auditLog.create({
        data: {
          staffId: req.user.userId,
          action: "BLOG_ARCHIVED",
          entityType: "BLOG_POST",
          entityId: article.id,
          metadata: {
            fields: ["status", "publishedAt"],
            status: article.status,
          },
        },
      });
      return article;
    });
  }
}

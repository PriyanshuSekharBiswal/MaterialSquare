import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Controller("blogs")
export class PublicBlogsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  list(@Query("page") page = "1") {
    const parsedPage = Math.max(1, Math.min(1000, Number(page) || 1));
    return this.prisma.blogPost.findMany({
      where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      skip: (parsedPage - 1) * 20,
      take: 20,
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        body: true,
        featuredImageUrl: true,
        publishedAt: true,
        authorName: true,
      },
    });
  }
  @Get(":slug")
  async detail(@Param("slug") slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, status: "PUBLISHED", publishedAt: { lte: new Date() } },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        body: true,
        featuredImageUrl: true,
        publishedAt: true,
        authorName: true,
      },
    });
    if (!post) throw new NotFoundException("Article not found");
    return post;
  }
}

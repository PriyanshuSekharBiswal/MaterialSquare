import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { SITE_CONTENT_DEFAULTS, type SiteContentKey } from "@material-square/types";
import { z } from "zod";
import { StaffGuard } from "../auth/access.guard";
import { validate } from "../common/validation";
import { PrismaService } from "../prisma/prisma.service";

const keys = Object.keys(SITE_CONTENT_DEFAULTS) as SiteContentKey[];
const allowed = new Set<string>(keys);
const contentSchema = z.record(z.string(), z.string().trim().max(2000)).superRefine((content, ctx) => {
  for (const key of Object.keys(content)) {
    if (!allowed.has(key)) ctx.addIssue({ code: "custom", path: [key], message: "Unknown website content field" });
  }
  for (const key of keys) {
    if (typeof content[key] !== "string") ctx.addIssue({ code: "custom", path: [key], message: "Every website content field is required" });
  }
  if (content["contact.phone"] && !/^[6-9]\d{9}$/.test(content["contact.phone"]))
    ctx.addIssue({ code: "custom", path: ["contact.phone"], message: "Enter a 10-digit Indian mobile number" });
  if (content["contact.email"] && !z.string().email().safeParse(content["contact.email"]).success)
    ctx.addIssue({ code: "custom", path: ["contact.email"], message: "Enter a valid contact email" });
});

@Controller("site-content")
export class PublicSiteContentController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    const saved = await this.prisma.websiteContent.findUnique({ where: { id: "global" } });
    const content = saved?.content && typeof saved.content === "object" && !Array.isArray(saved.content)
      ? saved.content as Record<string, unknown>
      : {};
    return Object.fromEntries(keys.map((key) => [
      key,
      typeof content[key] === "string" ? content[key] : SITE_CONTENT_DEFAULTS[key],
    ]));
  }
}

@Controller("admin/site-content")
@UseGuards(StaffGuard)
export class AdminSiteContentController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    return new PublicSiteContentController(this.prisma).get();
  }

  @Put()
  async save(@Body() body: unknown) {
    const content = validate(contentSchema, body);
    await this.prisma.websiteContent.upsert({
      where: { id: "global" },
      create: { id: "global", content: content as Prisma.InputJsonObject },
      update: { content: content as Prisma.InputJsonObject },
    });
    return content;
  }
}

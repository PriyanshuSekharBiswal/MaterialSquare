import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { StaffGuard } from "../auth/access.guard";
import { validate } from "../common/validation";
import { AnalyticsService, type WebsiteAnalyticsEvent } from "./analytics.service";

const pageKeys = ["home", "marketplace", "why-us", "guides", "get-quote", "contact", "blogs", "experts"] as const;
const publicEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("page_view"), target: z.enum(pageKeys) }),
  z.object({ type: z.literal("product_view"), target: z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/) }),
  z.object({ type: z.literal("add_to_list"), target: z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/) }),
  z.object({ type: z.literal("request_handoff"), target: z.enum(["whatsapp", "email"]) }),
]);

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post("events")
  recordEvent(@Body() body: unknown) {
    const event = validate(publicEventSchema, body);
    return this.analyticsService.recordWebsiteEvent(event as WebsiteAnalyticsEvent);
  }

  @Get("overview")
  @UseGuards(StaffGuard)
  getWebsiteOverview(@Query("days") days?: string) {
    const parsedDays = days === undefined ? 30 : Number(days);
    return this.analyticsService.getWebsiteOverview(parsedDays);
  }

  @Get("dashboard")
  @UseGuards(StaffGuard)
  getDashboardKPIs() {
    return this.analyticsService.getExecutiveKPIs();
  }
}

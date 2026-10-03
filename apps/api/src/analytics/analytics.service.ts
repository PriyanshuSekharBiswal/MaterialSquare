import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type WebsiteAnalyticsEvent = {
  type: "page_view" | "product_view" | "add_to_list" | "request_handoff";
  target: string;
};

function indiaDay(now: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === name)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async recordWebsiteEvent(event: WebsiteAnalyticsEvent) {
    if (event.type === "product_view" || event.type === "add_to_list") {
      const product = await this.prisma.catalogListing.findFirst({
        where: { isPublished: true, OR: [{ id: event.target }, { slug: event.target }] },
        select: { id: true },
      });
      if (!product) return { recorded: false };
    }
    const [year, month, day] = indiaDay(new Date()).split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    await this.prisma.analyticsCounter.upsert({
      where: { day_eventType_targetKey: { day: date, eventType: event.type, targetKey: event.target } },
      create: { day: date, eventType: event.type, targetKey: event.target, count: 1 },
      update: { count: { increment: 1 } },
    });
    return { recorded: true };
  }

  async getWebsiteOverview(days = 30) {
    if (!Number.isInteger(days) || days < 1 || days > 90)
      throw new BadRequestException("Analytics range must be between 1 and 90 days");
    const today = indiaDay(new Date());
    const [year, month, day] = today.split("-").map(Number);
    const end = new Date(Date.UTC(year, month - 1, day));
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days + 1);
    const counters = await this.prisma.analyticsCounter.findMany({
      where: { day: { gte: start, lte: end } },
      orderBy: [{ day: "asc" }, { eventType: "asc" }],
    });
    const totals = { pageViews: 0, productViews: 0, addToList: 0, requestHandoffs: 0 };
    const daily = new Map<string, typeof totals>();
    const pages = new Map<string, number>();
    const products = new Map<string, number>();
    for (const counter of counters) {
      const date = counter.day.toISOString().slice(0, 10);
      const row = daily.get(date) || { pageViews: 0, productViews: 0, addToList: 0, requestHandoffs: 0 };
      if (counter.eventType === "page_view") {
        totals.pageViews += counter.count; row.pageViews += counter.count;
        pages.set(counter.targetKey, (pages.get(counter.targetKey) || 0) + counter.count);
      } else if (counter.eventType === "product_view") {
        totals.productViews += counter.count; row.productViews += counter.count;
        products.set(counter.targetKey, (products.get(counter.targetKey) || 0) + counter.count);
      } else if (counter.eventType === "add_to_list") {
        totals.addToList += counter.count; row.addToList += counter.count;
      } else if (counter.eventType === "request_handoff") {
        totals.requestHandoffs += counter.count; row.requestHandoffs += counter.count;
      }
      daily.set(date, row);
    }
    const topProductIds = [...products.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const catalogue = topProductIds.length
      ? await this.prisma.catalogListing.findMany({
          where: { OR: topProductIds.flatMap(([id]) => [{ id }, { slug: id }]) },
          select: { id: true, slug: true, name: true },
        })
      : [];
    const catalogueByKey = new Map(catalogue.flatMap((product) => [[product.id, product.name] as const, [product.slug, product.name] as const]));
    const dailyRows = Array.from({ length: days }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      return { date: key, ...(daily.get(key) || { pageViews: 0, productViews: 0, addToList: 0, requestHandoffs: 0 }) };
    });
    return {
      days,
      totals,
      daily: dailyRows,
      topPages: [...pages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([page, views]) => ({ page, views })),
      topProducts: topProductIds.map(([id, views]) => ({ id, name: catalogueByKey.get(id) || "Unpublished product", views })),
      privacy: "Aggregate event counts only; no visitor IDs, search terms, addresses, or contact details are stored.",
    };
  }

  async getExecutiveKPIs() {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const [orders, rfqs] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: start }, status: { not: "CANCELLED" } },
      }),
      this.prisma.rfq.count({ where: { status: "NEW" } }),
    ]);
    const daily = new Map<string, number>();
    for (const order of orders) {
      const day = order.createdAt.toISOString().slice(0, 10);
      daily.set(day, (daily.get(day) || 0) + Number(order.grandTotal));
    }
    return {
      currentMonthOrderValueInr: orders.reduce(
        (sum, o) => sum + Number(o.grandTotal),
        0,
      ),
      activeRfqsCount: rfqs,
      dailyOrderValue: [...daily]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value })),
    };
  }
}

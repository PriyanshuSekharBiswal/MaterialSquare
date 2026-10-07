import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "./analytics.service";

describe("first-party website analytics", () => {
  afterEach(() => jest.useRealTimers());

  it("stores only a daily aggregate counter in India Standard Time", async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const service = new AnalyticsService({
      analyticsCounter: { upsert },
    } as unknown as PrismaService);
    jest.useFakeTimers().setSystemTime(new Date("2026-10-03T19:00:00.000Z"));

    await expect(service.recordWebsiteEvent({ type: "page_view", target: "home" }))
      .resolves.toEqual({ recorded: true });

    expect(upsert).toHaveBeenCalledWith({
      where: { day_eventType_targetKey: { day: new Date("2026-10-04T00:00:00.000Z"), eventType: "page_view", targetKey: "home" } },
      create: { day: new Date("2026-10-04T00:00:00.000Z"), eventType: "page_view", targetKey: "home", count: 1 },
      update: { count: { increment: 1 } },
    });
  });

  it("does not count product interactions for unpublished or unknown products", async () => {
    const upsert = jest.fn();
    const service = new AnalyticsService({
      catalogListing: { findFirst: jest.fn().mockResolvedValue(null) },
      analyticsCounter: { upsert },
    } as unknown as PrismaService);

    await expect(service.recordWebsiteEvent({ type: "product_view", target: "unknown-product" }))
      .resolves.toEqual({ recorded: false });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("summarizes page and product activity without visitor identifiers or search terms", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-03T18:00:00.000Z"));
    const service = new AnalyticsService({
      analyticsCounter: {
        findMany: jest.fn().mockResolvedValue([
          { day: new Date("2026-10-02T00:00:00.000Z"), eventType: "page_view", targetKey: "home", count: 3 },
          { day: new Date("2026-10-03T00:00:00.000Z"), eventType: "product_view", targetKey: "pipe-a", count: 2 },
          { day: new Date("2026-10-03T00:00:00.000Z"), eventType: "add_to_list", targetKey: "pipe-a", count: 1 },
          { day: new Date("2026-10-03T00:00:00.000Z"), eventType: "request_handoff", targetKey: "email", count: 1 },
        ]),
      },
      catalogListing: {
        findMany: jest.fn().mockResolvedValue([{ id: "id-a", slug: "pipe-a", name: "Astral CPVC Pipe" }]),
      },
    } as unknown as PrismaService);

    const overview = await service.getWebsiteOverview(2);

    expect(overview.totals).toEqual({ pageViews: 3, productViews: 2, addToList: 1, requestHandoffs: 1 });
    expect(overview.daily).toEqual([
      { date: "2026-10-02", pageViews: 3, productViews: 0, addToList: 0, requestHandoffs: 0 },
      { date: "2026-10-03", pageViews: 0, productViews: 2, addToList: 1, requestHandoffs: 1 },
    ]);
    expect(overview.topPages).toEqual([{ page: "home", views: 3 }]);
    expect(overview.topProducts).toEqual([{ id: "pipe-a", name: "Astral CPVC Pipe", views: 2, addToList: 1 }]);
    expect(overview.privacy).toContain("no visitor IDs");
  });

  it("rejects ranges outside the 1-to-90-day dashboard limit", async () => {
    const service = new AnalyticsService({} as PrismaService);
    await expect(service.getWebsiteOverview(0)).rejects.toThrow("Analytics range must be between 1 and 90 days");
    await expect(service.getWebsiteOverview(91)).rejects.toThrow("Analytics range must be between 1 and 90 days");
  });
});

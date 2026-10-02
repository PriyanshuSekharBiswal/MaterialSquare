import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}
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

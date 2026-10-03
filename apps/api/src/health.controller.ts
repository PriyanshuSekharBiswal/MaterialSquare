import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";
import { productionReadinessGaps } from "./runtime-readiness";
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() live() { return { status: "ok" }; }
  @Get("ready") async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      if (productionReadinessGaps().length)
        throw new ServiceUnavailableException("Service not ready");
      return { status: "ready" };
    } catch {
      throw new ServiceUnavailableException("Service not ready");
    }
  }
}

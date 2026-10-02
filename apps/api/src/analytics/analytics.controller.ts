import { UseGuards } from "@nestjs/common";
import { StaffGuard } from "../auth/access.guard";
import { Controller, Get } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
@UseGuards(StaffGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("dashboard")
  getDashboardKPIs() {
    return this.analyticsService.getExecutiveKPIs();
  }
}

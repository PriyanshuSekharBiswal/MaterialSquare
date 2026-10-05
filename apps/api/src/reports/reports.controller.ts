import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { StaffGuard } from "../auth/access.guard";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(StaffGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("sales")
  sales(@Query() query: unknown) {
    return this.reports.sales(query);
  }

  @Get("procurement")
  procurement(@Query() query: unknown) {
    return this.reports.procurement(query);
  }

  @Get("fulfillment")
  fulfillment(@Query() query: unknown) {
    return this.reports.fulfillment(query);
  }
}

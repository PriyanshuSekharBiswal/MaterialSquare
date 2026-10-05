import { PdfModule } from "../pdf/pdf.module";
import { Module } from "@nestjs/common";
import {
  CustomerQuotesController,
  QuotesController,
} from "./quotes.controller";
import { QuotesService } from "./quotes.service";
import { JobsModule } from "../jobs/jobs.module";
import { QuotationAcceptanceService } from "./quotation-acceptance.service";

@Module({
  imports: [JobsModule, PdfModule],
  controllers: [QuotesController, CustomerQuotesController],
  providers: [QuotesService, QuotationAcceptanceService],
  exports: [QuotesService, QuotationAcceptanceService],
})
export class QuotesModule {}

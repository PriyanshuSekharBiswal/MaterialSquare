import { PdfModule } from "../pdf/pdf.module";
import { Module } from "@nestjs/common";
import { CustomerQuotesController, QuotesController } from "./quotes.controller";
import { QuotesService } from "./quotes.service";
import { JobsModule } from "../jobs/jobs.module";

@Module({
  imports: [JobsModule, PdfModule],
  controllers: [QuotesController, CustomerQuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}

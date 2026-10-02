import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { PdfModule } from "../pdf/pdf.module";
import { JobsModule } from "../jobs/jobs.module";

@Module({
  imports: [PdfModule, JobsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

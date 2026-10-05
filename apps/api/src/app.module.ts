import { AuditModule } from "./audit/audit.module";
import { WorkspaceModule } from "./workspace/workspace.module";
import { HealthController } from "./health.controller";
import { RfqsModule } from "./rfqs/rfqs.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ProductsModule } from "./products/products.module";
import { QuotesModule } from "./quotes/quotes.module";
import { OrdersModule } from "./orders/orders.module";
import { PdfModule } from "./pdf/pdf.module";
import { StorageModule } from "./storage/storage.module";
import { JobsModule } from "./jobs/jobs.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { BusinessModule } from "./business/business.module";
import { SiteContentModule } from "./site-content/site-content.module";
import { ReportsModule } from "./reports/reports.module";

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    PrismaModule,
    WorkspaceModule,
    RfqsModule,
    AuthModule,
    ProductsModule,
    QuotesModule,
    OrdersModule,
    PdfModule,
    StorageModule,
    JobsModule,
    AnalyticsModule,
    BusinessModule,
    SiteContentModule,
    ReportsModule,
    AuditModule,
  ],
})
export class AppModule {}

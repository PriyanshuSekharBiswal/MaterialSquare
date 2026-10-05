import { Module } from "@nestjs/common";
import { PdfModule } from "../pdf/pdf.module";
import { PurchaseOrderRevisionsController } from "./purchase-orders/purchase-order-revisions.controller";
import { QuoteFollowupsController } from "./followups/quote-followups.controller";
import { TransportationController } from "./transportation/transportation.controller";
import { OrderDeliveriesService } from "./transportation/order-deliveries.service";
import { CommissionController } from "./commissions/commissions.controller";
import { CommissionsService } from "./commissions/commissions.service";
import { LoyaltyManagementController } from "./loyalty/loyalty-management.controller";
import { BlogManagementController } from "./content/blog-management.controller";
import { ExpertManagementController } from "./content/expert-management.controller";
import { PublicBlogsController } from "./content/public-blogs.controller";
import { PublicExpertsController } from "./content/public-experts.controller";
import { DiscountRulesController } from "./discounts/discount-rules.controller";
import { ProcurementController } from "./procurement/procurement.controller";
import { PurchaseOrdersController } from "./purchase-orders/purchase-orders.controller";
import { SuppliersController } from "./suppliers/suppliers.controller";
import { BusinessRulesController } from "./settings/business-rules.controller";

@Module({
  imports: [PdfModule],
  controllers: [
    SuppliersController,
    ProcurementController,
    PurchaseOrdersController,
    PurchaseOrderRevisionsController,
    DiscountRulesController,
    PublicBlogsController,
    BlogManagementController,
    PublicExpertsController,
    ExpertManagementController,
    QuoteFollowupsController,
    TransportationController,
    CommissionController,
    LoyaltyManagementController,
    BusinessRulesController,
  ],
  providers: [OrderDeliveriesService, CommissionsService],
})
export class BusinessModule {}

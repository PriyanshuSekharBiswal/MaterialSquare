import { Module } from "@nestjs/common";
import { AdminSiteContentController, PublicSiteContentController } from "./site-content.controller";

@Module({ controllers: [PublicSiteContentController, AdminSiteContentController] })
export class SiteContentModule {}

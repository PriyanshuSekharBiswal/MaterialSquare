import { StorageController } from "./storage.controller";
import { Module } from "@nestjs/common";
import { StorageService } from "./storage.service";
import { MediaAssetsService } from "./media-assets.service";

@Module({
  controllers: [StorageController],
  providers: [StorageService, MediaAssetsService],
  exports: [StorageService],
})
export class StorageModule {}

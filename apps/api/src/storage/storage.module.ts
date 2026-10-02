import { StorageController } from "./storage.controller";
import { Module } from "@nestjs/common";
import { StorageService } from "./storage.service";

@Module({
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}

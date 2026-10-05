import { NotificationStatusController } from "./notification-status.controller";
import { Module } from "@nestjs/common";
import { QueueService } from "./queue.service";

@Module({
  controllers: [NotificationStatusController],
  providers: [QueueService],
  exports: [QueueService],
})
export class JobsModule {}

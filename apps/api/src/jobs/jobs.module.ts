import { NotificationStatusController } from "./notification-status.controller";
import { Module } from "@nestjs/common";
import { QueueService } from "./queue.service";
import { Msg91SmsService } from "./msg91-sms.service";

@Module({
  controllers: [NotificationStatusController],
  providers: [QueueService, Msg91SmsService],
  exports: [QueueService],
})
export class JobsModule {}

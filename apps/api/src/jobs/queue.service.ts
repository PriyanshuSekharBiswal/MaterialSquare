import { PrismaService } from "../prisma/prisma.service";
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  constructor(private prisma: PrismaService) {}
  private timer?: ReturnType<typeof setInterval>;
  private flushing = false;
  private connection?: IORedis;
  private queue?: Queue;
  private worker?: Worker;
  private readonly logger = new Logger(QueueService.name);
  async onModuleInit() {
    if (!process.env.REDIS_URL || !process.env.NOTIFICATION_WEBHOOK_URL) {
      this.logger.warn(
        "Notifications pending: configure REDIS_URL and NOTIFICATION_WEBHOOK_URL",
      );
      return;
    }
    this.connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
    this.connection.on("error", () =>
      this.logger.error("Redis connection failed"),
    );
    this.queue = new Queue("material-notifications", {
      connection: this.connection,
    });
    this.worker = new Worker(
      "material-notifications",
      async (job) => {
        if (job.data.followupId) {
          const followup = await this.prisma.quotationFollowUp.findUnique({
            where: { id: job.data.followupId },
            select: { status: true },
          });
          if (!followup || followup.status !== "SCHEDULED") {
            if (job.data.outboxId)
              await this.prisma.notificationOutbox.update({
                where: { id: job.data.outboxId },
                data: {
                  skippedAt: new Date(),
                  skipReason: "Follow-up is no longer scheduled",
                  failedAt: null,
                },
              });
            return;
          }
        }
        if (job.name === "quote-expiry-reminder") {
          const quote = job.data.quoteId
            ? await this.prisma.quotation.findUnique({
                where: { id: job.data.quoteId },
                select: { status: true, validUntil: true },
              })
            : null;
          if (
            !quote ||
            quote.status !== "QUOTE_SENT" ||
            quote.validUntil <= new Date()
          ) {
            if (job.data.outboxId)
              await this.prisma.notificationOutbox.update({
                where: { id: job.data.outboxId },
                data: {
                  skippedAt: new Date(),
                  skipReason:
                    "Quotation is no longer awaiting a response or has expired",
                  failedAt: null,
                },
              });
            return;
          }
        }
        const endpoint = process.env.NOTIFICATION_WEBHOOK_URL;
        if (!endpoint)
          throw new Error("Notification provider is not configured");
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NOTIFICATION_WEBHOOK_TOKEN || ""}`,
            "Idempotency-Key": String(job.id),
          },
          body: JSON.stringify({ type: job.name, ...job.data }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok)
          throw new Error(`Notification provider returned ${response.status}`);
        if (job.data.outboxId)
          await this.prisma.notificationOutbox.update({
            where: { id: job.data.outboxId },
            data: { deliveredAt: new Date(), failedAt: null },
          });
        if (job.data.followupId)
          await this.prisma.quotationFollowUp.updateMany({
            where: { id: job.data.followupId, status: "SCHEDULED" },
            data: { status: "SENT", sentAt: new Date() },
          });
      },
      { connection: this.connection, concurrency: 4 },
    );
    this.worker.on("failed", (job) => {
      this.logger.error(`Notification job ${job?.id} failed`);
      if (job?.data.outboxId && job.attemptsMade >= (job.opts.attempts || 1))
        void this.prisma.notificationOutbox
          .update({
            where: { id: job.data.outboxId },
            data: { failedAt: new Date() },
          })
          .catch(() =>
            this.logger.error("Could not record notification failure"),
          );
      if (job?.data.followupId && job.attemptsMade >= (job.opts.attempts || 1))
        void this.prisma.quotationFollowUp
          .updateMany({
            where: { id: job.data.followupId, status: "SCHEDULED" },
            data: { status: "FAILED" },
          })
          .catch(() => this.logger.error("Could not record follow-up failure"));
    });
    this.worker.on("error", () =>
      this.logger.error("Notification worker error"),
    );
    this.timer = setInterval(() => {
      void this.flushOutbox();
    }, 5000);
    await this.flushOutbox();
  }
  private async flushOutbox() {
    if (this.flushing || !this.queue) return;
    this.flushing = true;
    try {
      const pending = await this.prisma.notificationOutbox.findMany({
        where: { queuedAt: null },
        orderBy: { createdAt: "asc" },
        take: 100,
      });
      for (const item of pending) {
        await this.queue.add(
          item.type,
          { ...(item.payload as Record<string, string>), outboxId: item.id },
          {
            jobId: item.id,
            delay: Math.max(0, item.runAt.getTime() - Date.now()),
            attempts: 5,
            backoff: { type: "exponential", delay: 1000 },
          },
        );
        await this.prisma.notificationOutbox.update({
          where: { id: item.id },
          data: { queuedAt: new Date() },
        });
      }
    } catch {
      this.logger.error("Could not enqueue notifications; will retry");
    } finally {
      this.flushing = false;
    }
  }
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit();
  }
}

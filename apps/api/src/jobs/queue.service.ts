import { PrismaService } from "../prisma/prisma.service";
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { readFileSync } from "node:fs";
import { Msg91SmsService } from "./msg91-sms.service";
import { isCanonicalHttpsUrl, isSafeBearerToken } from "../runtime-readiness";

function redisConnectionUrl() {
  const configuredUrl = process.env.REDIS_URL;
  if (!configuredUrl) return null;
  const passwordFile = process.env.REDIS_PASSWORD_FILE;
  if (!passwordFile) return configuredUrl;
  const url = new URL(configuredUrl);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:")
    throw new Error("REDIS_URL must use Redis protocol");
  const password = readFileSync(passwordFile, "utf8").trim();
  if (!password) throw new Error("Redis password secret file is empty");
  url.password = password;
  return url.toString();
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private prisma: PrismaService,
    private readonly msg91Sms: Msg91SmsService = new Msg91SmsService(),
  ) {}
  private timer?: ReturnType<typeof setInterval>;
  private flushing = false;
  private outboxCursor: { id: string; createdAt: Date } | null = null;
  private outboxScanBoundary: { id: string; createdAt: Date } | null = null;
  private connection?: IORedis;
  private queue?: Queue;
  private worker?: Worker;
  private readonly logger = new Logger(QueueService.name);
  async onModuleInit() {
    if (!this.hasAnyProvider()) {
      this.logger.warn(
        "Notifications pending: configure an SMS template or notification webhook",
      );
      return;
    }
    let connectionUrl: string | null;
    try {
      connectionUrl = redisConnectionUrl();
    } catch {
      this.logger.error("Redis configuration unavailable; notifications remain pending");
      return;
    }
    if (!connectionUrl) {
      this.logger.warn("Notifications pending: configure REDIS_URL");
      return;
    }
    this.connection = new IORedis(connectionUrl, {
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
        if (this.shouldSendSms(job.name, job.data)) {
          await this.msg91Sms.send(job.name, job.data, String(job.id));
        } else {
          const endpoint = process.env.NOTIFICATION_WEBHOOK_URL?.trim();
          const webhookToken = process.env.NOTIFICATION_WEBHOOK_TOKEN?.trim();
          if (!endpoint || (process.env.NODE_ENV === "production" && !this.webhookConfigured()))
            throw new Error(
              `No authenticated notification webhook configured for ${job.name}`,
            );
          const response = await fetch(endpoint, {
            method: "POST",
            redirect: "error",
            headers: {
              "Content-Type": "application/json",
              ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
              "Idempotency-Key": String(job.id),
            },
            body: JSON.stringify({ type: job.name, ...job.data }),
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok)
            throw new Error(
              `Notification provider returned ${response.status}`,
            );
        }
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
      if (!this.outboxScanBoundary) {
        const newestPending = await this.prisma.notificationOutbox.findFirst({
          where: { queuedAt: null, skippedAt: null },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: { id: true, createdAt: true },
        });
        if (!newestPending) {
          this.outboxCursor = null;
          return;
        }
        this.outboxScanBoundary = newestPending;
        this.outboxCursor = null;
      }
      const cursor = this.outboxCursor;
      const boundary = this.outboxScanBoundary;
      if (!boundary) return;
      const pending = await this.prisma.notificationOutbox.findMany({
        where: {
          queuedAt: null,
          skippedAt: null,
          AND: [
            {
              OR: [
                { createdAt: { lt: boundary.createdAt } },
                { createdAt: boundary.createdAt, id: { lte: boundary.id } },
              ],
            },
          ...(cursor
            ? [{
                OR: [
                  { createdAt: { gt: cursor.createdAt } },
                  { createdAt: cursor.createdAt, id: { gt: cursor.id } },
                ],
              }]
            : []),
          ],
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 100,
      });
      if (!pending.length) {
        this.outboxCursor = null;
        this.outboxScanBoundary = null;
        return;
      }
      for (const item of pending) {
        const payload = item.payload as Record<string, unknown>;
        if (!this.canDeliver(item.type, payload)) continue;
        await this.queue.add(
          item.type,
          { ...(payload as Record<string, string>), outboxId: item.id },
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
      const last = pending[pending.length - 1];
      this.outboxCursor = { id: last.id, createdAt: last.createdAt };
      if (
        last.createdAt > boundary.createdAt ||
        (last.createdAt.getTime() === boundary.createdAt.getTime() &&
          last.id >= boundary.id)
      ) {
        this.outboxCursor = null;
        this.outboxScanBoundary = null;
      }
    } catch {
      this.logger.error("Could not enqueue notifications; will retry");
    } finally {
      this.flushing = false;
    }
  }

  private hasAnyProvider() {
    return Boolean(
      this.webhookConfigured() ||
      (process.env.MSG91_AUTHKEY?.trim() &&
        [
          "quote-published",
          "quote-expiry-reminder",
          "quote-follow-up",
          "dispatch-whatsapp-alert",
        ].some((type) => this.msg91Sms.hasTemplate(type))),
    );
  }

  private shouldSendSms(type: string, payload: Record<string, unknown>) {
    if (type === "quote-follow-up" && payload.channel !== "SMS") return false;
    return Boolean(
      process.env.MSG91_AUTHKEY?.trim() && this.msg91Sms.hasTemplate(type),
    );
  }

  private canDeliver(type: string, payload: Record<string, unknown>) {
    if (this.shouldSendSms(type, payload)) return true;
    return this.webhookConfigured();
  }

  private webhookConfigured() {
    const endpoint = process.env.NOTIFICATION_WEBHOOK_URL?.trim();
    const token = process.env.NOTIFICATION_WEBHOOK_TOKEN?.trim();
    const secureEndpoint = process.env.NODE_ENV === "production"
      ? isCanonicalHttpsUrl(endpoint, true)
      : Boolean(endpoint);
    const tokenIsSafe = !token || isSafeBearerToken(token);
    return Boolean(
      secureEndpoint &&
        tokenIsSafe &&
        (process.env.NODE_ENV !== "production" ||
          isSafeBearerToken(token)),
    );
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit();
  }
}

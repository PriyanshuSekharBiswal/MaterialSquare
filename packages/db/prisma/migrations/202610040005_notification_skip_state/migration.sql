ALTER TABLE "notification_outbox" ADD COLUMN "skippedAt" TIMESTAMP(3), ADD COLUMN "skipReason" TEXT;

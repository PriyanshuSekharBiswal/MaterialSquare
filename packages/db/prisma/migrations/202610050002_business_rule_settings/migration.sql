CREATE TABLE "business_rule_settings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "quotationValidityHours" INTEGER NOT NULL DEFAULT 48,
  "sendQuotePublishedNotification" BOOLEAN NOT NULL DEFAULT true,
  "sendQuoteExpiryReminder" BOOLEAN NOT NULL DEFAULT true,
  "expiryReminderHoursBefore" INTEGER NOT NULL DEFAULT 24,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_rule_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "business_rule_settings" (
  "id",
  "updatedAt"
) VALUES (
  'global',
  CURRENT_TIMESTAMP
);

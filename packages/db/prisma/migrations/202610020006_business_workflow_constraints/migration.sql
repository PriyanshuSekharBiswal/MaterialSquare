CREATE UNIQUE INDEX "procurement_requests_orderId_key" ON "procurement_requests"("orderId");

CREATE TABLE "loyalty_program_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "pointsPer100Inr" DECIMAL(8,3) NOT NULL DEFAULT 0,
    "minimumOrderValueInr" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "redemptionValuePerPoint" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "minimumRedemptionPoints" INTEGER NOT NULL DEFAULT 0,
    "expiryAfterDays" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "loyalty_program_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "loyalty_transactions_orderId_type_key" ON "loyalty_transactions"("orderId", "type");

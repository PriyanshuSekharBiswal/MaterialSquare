-- Phone-verified customer accounts use hashed, revocable browser sessions.
-- Existing CRM, quotation, RFQ, order, and loyalty records remain untouched.
CREATE TABLE "customer_sessions" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_sessions_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "customer_sessions_customerId_idx" ON "customer_sessions"("customerId");
CREATE INDEX "customer_sessions_expiresAt_idx" ON "customer_sessions"("expiresAt");

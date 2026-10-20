ALTER TABLE "customer_sessions"
  ADD COLUMN "previousId" VARCHAR(64),
  ADD COLUMN "previousValidUntil" TIMESTAMP(3);

CREATE UNIQUE INDEX "customer_sessions_previousId_key"
  ON "customer_sessions"("previousId");

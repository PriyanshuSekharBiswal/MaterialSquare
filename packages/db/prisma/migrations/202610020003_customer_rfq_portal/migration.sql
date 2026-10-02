ALTER TABLE "rfqs" ADD COLUMN "customerId" TEXT;

CREATE INDEX "rfqs_customerId_createdAt_idx" ON "rfqs"("customerId", "createdAt");

ALTER TABLE "rfqs"
ADD CONSTRAINT "rfqs_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "customers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

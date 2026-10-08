CREATE TYPE "ManualPaymentStatus" AS ENUM ('UNPAID', 'PAID');

CREATE TYPE "ManualPaymentMethod" AS ENUM ('CASH', 'UPI', 'OTHER');

ALTER TABLE "orders"
  ADD COLUMN "manualPaymentStatus" "ManualPaymentStatus" NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN "manualPaymentMethod" "ManualPaymentMethod",
  ADD COLUMN "manualPaymentReference" TEXT,
  ADD COLUMN "manualPaymentRecordedAt" TIMESTAMP(3),
  ADD COLUMN "manualPaymentRecordedById" TEXT;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_manualPaymentRecordedById_fkey"
  FOREIGN KEY ("manualPaymentRecordedById")
  REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "orders_manualPaymentStatus_createdAt_idx"
  ON "orders"("manualPaymentStatus", "createdAt");

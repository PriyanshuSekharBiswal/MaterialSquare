ALTER TYPE "ManualPaymentStatus" ADD VALUE 'PARTIALLY_PAID';
ALTER TYPE "ManualPaymentMethod" ADD VALUE 'CARD';

CREATE TABLE "order_payments" (
    "id" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountInr" DECIMAL(12,2) NOT NULL,
    "method" "ManualPaymentMethod" NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_payments_paymentNumber_key" ON "order_payments"("paymentNumber");
CREATE INDEX "order_payments_orderId_recordedAt_idx" ON "order_payments"("orderId", "recordedAt");
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

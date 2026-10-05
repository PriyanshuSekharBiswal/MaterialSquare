ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_DELIVERED';
ALTER TABLE "orders" ADD COLUMN "deliveryVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "order_deliveries" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "deliveryNumber" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_delivery_items" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    CONSTRAINT "order_delivery_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_deliveries_deliveryNumber_key" ON "order_deliveries"("deliveryNumber");
CREATE INDEX "order_deliveries_orderId_deliveredAt_idx" ON "order_deliveries"("orderId", "deliveredAt");
CREATE UNIQUE INDEX "order_delivery_items_deliveryId_orderItemId_key" ON "order_delivery_items"("deliveryId", "orderItemId");
CREATE INDEX "order_delivery_items_orderItemId_idx" ON "order_delivery_items"("orderItemId");

ALTER TABLE "order_deliveries" ADD CONSTRAINT "order_deliveries_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_delivery_items" ADD CONSTRAINT "order_delivery_items_deliveryId_fkey"
FOREIGN KEY ("deliveryId") REFERENCES "order_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_delivery_items" ADD CONSTRAINT "order_delivery_items_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

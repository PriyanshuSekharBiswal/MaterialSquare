ALTER TABLE "supplier_products"
ADD COLUMN "availableQuantity" DECIMAL(12,3),
ADD COLUMN "availabilityCheckedAt" TIMESTAMP(3);

CREATE INDEX "supplier_products_brand_category_isActive_idx"
ON "supplier_products"("brand", "category", "isActive");

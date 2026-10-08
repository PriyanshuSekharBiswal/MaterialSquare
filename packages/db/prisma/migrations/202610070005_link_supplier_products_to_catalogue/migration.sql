ALTER TABLE "supplier_products"
ADD COLUMN "catalogVariantId" TEXT;

CREATE INDEX "supplier_products_catalogVariantId_idx"
ON "supplier_products"("catalogVariantId");

ALTER TABLE "supplier_products"
ADD CONSTRAINT "supplier_products_catalogVariantId_fkey"
FOREIGN KEY ("catalogVariantId") REFERENCES "catalog_listing_variants"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

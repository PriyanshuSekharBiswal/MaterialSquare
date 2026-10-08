DROP INDEX IF EXISTS "supplier_products_supplierId_productName_brand_key";

CREATE UNIQUE INDEX "supplier_products_supplierId_catalogVariantId_key"
  ON "supplier_products"("supplierId", "catalogVariantId");

CREATE UNIQUE INDEX "supplier_products_unlinked_identity_key"
  ON "supplier_products"(
    "supplierId",
    lower("productName"),
    lower("brand"),
    lower("unit")
  )
  WHERE "catalogVariantId" IS NULL AND "deletedAt" IS NULL;

-- Save sellable catalogue identity and unit with each quotation/order line.
-- Existing steel inventory links remain intact; catalogue lines use snapshots.
ALTER TABLE "quotation_items" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "order_items" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "quotation_items" ALTER COLUMN "quantityMt" TYPE DECIMAL(12,3);
ALTER TABLE "order_items" ALTER COLUMN "quantityMt" TYPE DECIMAL(12,3);
ALTER TABLE "quotation_items" ADD COLUMN "catalogueId" TEXT, ADD COLUMN "variantId" TEXT,
 ADD COLUMN "productName" TEXT NOT NULL DEFAULT '', ADD COLUMN "brandName" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "categoryName" TEXT NOT NULL DEFAULT '', ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'MT', ADD COLUMN "specification" TEXT NOT NULL DEFAULT '';
ALTER TABLE "order_items" ADD COLUMN "catalogueId" TEXT, ADD COLUMN "variantId" TEXT,
 ADD COLUMN "productName" TEXT NOT NULL DEFAULT '', ADD COLUMN "brandName" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "categoryName" TEXT NOT NULL DEFAULT '', ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'MT', ADD COLUMN "specification" TEXT NOT NULL DEFAULT '';
UPDATE "quotation_items" i SET "productName" = p.name, "brandName" = b.name, "categoryName" = p.category::text, "unit" = p.unit FROM "product_skus" p JOIN "brands" b ON b.id = p."brandId" WHERE p.id = i."productId";
UPDATE "order_items" i SET "productName" = p.name, "brandName" = b.name, "categoryName" = p.category::text, "unit" = p.unit FROM "product_skus" p JOIN "brands" b ON b.id = p."brandId" WHERE p.id = i."productId";

ALTER TABLE "catalog_listings"
  ADD COLUMN "galleryImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "catalog_listing_variants" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "code" TEXT,
  "label" TEXT NOT NULL,
  "attributes" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "unit" TEXT NOT NULL,
  "price" DECIMAL(12,2),
  "compareAtPrice" DECIMAL(12,2),
  "priceNote" TEXT,
  "offerLabel" TEXT,
  "offerStartsAt" TIMESTAMP(3),
  "offerEndsAt" TIMESTAMP(3),
  "isInStock" BOOLEAN NOT NULL DEFAULT false,
  "stockQuantity" DECIMAL(12,3),
  "minOrderQuantity" DECIMAL(12,3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "catalog_listing_variants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "catalog_listing_variants_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "catalog_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "catalog_listing_variants_code_key" ON "catalog_listing_variants"("code");
CREATE INDEX "catalog_listing_variants_listingId_sortOrder_idx"
  ON "catalog_listing_variants"("listingId", "sortOrder");

ALTER TABLE "catalog_listing_variants"
  ADD CONSTRAINT "catalog_listing_variants_price_check"
  CHECK ("price" IS NULL OR "price" >= 0),
  ADD CONSTRAINT "catalog_listing_variants_compare_price_check"
  CHECK ("compareAtPrice" IS NULL OR "price" IS NULL OR "compareAtPrice" >= "price"),
  ADD CONSTRAINT "catalog_listing_variants_stock_check"
  CHECK ("stockQuantity" IS NULL OR "stockQuantity" >= 0),
  ADD CONSTRAINT "catalog_listing_variants_min_order_check"
  CHECK ("minOrderQuantity" IS NULL OR "minOrderQuantity" > 0);

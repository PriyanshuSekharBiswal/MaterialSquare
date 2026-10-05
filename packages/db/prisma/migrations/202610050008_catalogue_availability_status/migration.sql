CREATE TYPE "CatalogAvailabilityStatus" AS ENUM (
  'IN_STOCK',
  'OUT_OF_STOCK',
  'CHECK_AVAILABILITY'
);

ALTER TABLE "catalog_listings"
  ADD COLUMN "availabilityStatus" "CatalogAvailabilityStatus" NOT NULL DEFAULT 'CHECK_AVAILABILITY';

ALTER TABLE "catalog_listing_variants"
  ADD COLUMN "availabilityStatus" "CatalogAvailabilityStatus" NOT NULL DEFAULT 'CHECK_AVAILABILITY';

UPDATE "catalog_listings"
SET "availabilityStatus" = 'IN_STOCK'
WHERE "isInStock" = true;

UPDATE "catalog_listing_variants"
SET "availabilityStatus" = 'IN_STOCK'
WHERE "isInStock" = true;

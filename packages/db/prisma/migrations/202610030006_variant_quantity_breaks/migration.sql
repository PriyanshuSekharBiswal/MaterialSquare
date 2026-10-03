ALTER TABLE "catalog_listing_variants"
  ADD COLUMN "quantityBreaks" JSONB NOT NULL DEFAULT '[]'::jsonb;

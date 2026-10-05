ALTER TABLE "catalog_listing_variants"
ADD COLUMN "image" TEXT,
ADD COLUMN "galleryImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

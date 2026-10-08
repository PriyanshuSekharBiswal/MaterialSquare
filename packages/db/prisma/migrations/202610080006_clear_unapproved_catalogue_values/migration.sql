-- Historical reference catalogue entries were inserted from third-party
-- research. They are not client inventory and must not retain prices, stock,
-- offers, minimums, or non-client imagery in the editable starter catalogue.
-- Keep the records and pack options as editable drafts for staff review.
UPDATE "catalog_listings"
SET "price" = NULL,
    "compareAtPrice" = NULL,
    "priceNote" = NULL,
    "offerLabel" = NULL,
    "offerStartsAt" = NULL,
    "offerEndsAt" = NULL,
    "isInStock" = FALSE,
    "availabilityStatus" = 'CHECK_AVAILABILITY',
    "minOrderQty" = NULL,
    "image" = NULL,
    "galleryImages" = '{}',
    "isPublished" = FALSE,
    "specifications" = "specifications" - 'Reference price source' - 'Reference note'
      - 'Reference source updated' - 'Reference image source',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" LIKE 'REF-%'
   OR "slug" LIKE '%-reference';

UPDATE "catalog_listing_variants"
SET "price" = NULL,
    "compareAtPrice" = NULL,
    "priceNote" = NULL,
    "offerLabel" = NULL,
    "offerStartsAt" = NULL,
    "offerEndsAt" = NULL,
    "isInStock" = FALSE,
    "availabilityStatus" = 'CHECK_AVAILABILITY',
    "stockQuantity" = NULL,
    "minOrderQuantity" = NULL,
    "quantityBreaks" = '[]'::jsonb,
    "image" = NULL,
    "galleryImages" = '{}',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "listingId" IN (
  SELECT "id"
  FROM "catalog_listings"
  WHERE "code" LIKE 'REF-%'
     OR "slug" LIKE '%-reference'
);

-- This item was re-created by the retired public preview seed after the
-- original catalogue cleanup. Keep the row for staff review, but do not show
-- it until the client confirms its details and staff explicitly republish it.
UPDATE "catalog_listings"
SET "isPublished" = FALSE,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'asian-paints-tractor-emulsion';

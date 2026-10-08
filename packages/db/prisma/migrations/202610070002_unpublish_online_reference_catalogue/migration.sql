-- Online listings added as research references are not approved client
-- inventory. Keep them available to staff for review, but hide them from the
-- public catalogue until staff replace the reference data and explicitly
-- publish the approved client records.
UPDATE "catalog_listings"
SET "isPublished" = FALSE,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" LIKE 'REF-%'
   OR "slug" LIKE '%-reference';

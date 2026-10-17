-- Older catalogue entries used an improvised category that is not part of the
-- storefront taxonomy. Move those listings into the standard paints category.
UPDATE "catalog_listings"
SET "category" = 'paints',
    "categoryLabel" = 'Paints & Wall Finishes'
WHERE regexp_replace(lower(coalesce("category", '')), '[^a-z0-9]+', '', 'g') = 'paintswallprep'
   OR regexp_replace(lower(coalesce("categoryLabel", '')), '[^a-z0-9]+', '', 'g') = 'paintswallprep';

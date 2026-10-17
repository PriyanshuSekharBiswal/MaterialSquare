-- The Instagram profile was approved by the site owner for the public footer.
-- Seed it where the previous privacy cleanup left the social-links field empty,
-- while preserving any links already configured by staff.
UPDATE "website_content"
SET "content" = jsonb_set(
  COALESCE("content", '{}'::jsonb),
  '{footer.socialLinks}',
  to_jsonb('[{"id":"instagram","label":"@materialsquare.in","url":"https://www.instagram.com/materialsquare.in/"}]'::text),
  true
)
WHERE "id" IN ('global', 'draft')
  AND COALESCE("content"->>'footer.socialLinks', '[]') IN ('', '[]');

-- Keep business contact data in the contact fields used by the single
-- Business details CMS page. Preserve any existing call and social settings.
UPDATE "website_content" AS wc
SET "content" = jsonb_set(
  jsonb_set(
    jsonb_set(
      COALESCE(wc."content", '{}'::jsonb),
      '{contact.whatsappPhone}',
      CASE
        WHEN COALESCE(wc."content", '{}'::jsonb) ? 'contact.whatsappPhone'
          THEN wc."content"->'contact.whatsappPhone'
        ELSE to_jsonb(COALESCE(NULLIF(wc."content"->>'contact.phone', ''), '7735527252'))
      END,
      true
    ),
    '{contact.instagramUrl}',
    CASE
      WHEN COALESCE(wc."content", '{}'::jsonb) ? 'contact.instagramUrl'
        THEN wc."content"->'contact.instagramUrl'
      ELSE to_jsonb('https://www.instagram.com/materialsquare.in/'::text)
    END,
    true
  ),
  '{footer.socialLinks}',
  to_jsonb(COALESCE((
    SELECT jsonb_agg(social.link)
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(COALESCE(NULLIF(wc."content"->>'footer.socialLinks', '')::jsonb, '[]'::jsonb)) = 'array'
          THEN COALESCE(NULLIF(wc."content"->>'footer.socialLinks', '')::jsonb, '[]'::jsonb)
        ELSE '[]'::jsonb
      END
    ) AS social(link)
    WHERE lower(COALESCE(social.link->>'url', '')) !~ '^https?://([^/]+\.)?instagram\.com/'
  ), '[]'::jsonb)::text),
  true
)
WHERE wc."id" IN ('global', 'draft');

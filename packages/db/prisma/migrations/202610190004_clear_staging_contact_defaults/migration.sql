-- Remove only contact values explicitly seeded for staging. Keep client
-- replacements and fields that were never populated.
CREATE OR REPLACE FUNCTION pg_temp.try_jsonb(value text) RETURNS jsonb AS $$
BEGIN
  RETURN value::jsonb;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION pg_temp.policy_uses_contact(value text, placeholder text) RETURNS boolean AS $$
DECLARE
  policy jsonb;
  section jsonb;
BEGIN
  policy := pg_temp.try_jsonb(value);
  IF jsonb_typeof(policy->'sections') IS DISTINCT FROM 'array' THEN
    RETURN false;
  END IF;
  FOR section IN SELECT item.value FROM jsonb_array_elements(policy->'sections') AS item(value) LOOP
    IF position(placeholder IN COALESCE(section->>'body', '')) > 0 THEN
      RETURN true;
    END IF;
  END LOOP;
  RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE "website_content"
SET "content" = "content" || jsonb_strip_nulls(jsonb_build_object(
  'contact.phone', CASE WHEN "content"->>'contact.phone' = '7735527252' THEN '""'::jsonb END,
  'contact.phoneDisplay', CASE WHEN "content"->>'contact.phoneDisplay' = '+91 77355 27252' THEN '""'::jsonb END,
  'contact.whatsappPhone', CASE WHEN "content"->>'contact.whatsappPhone' = '7735527252' THEN '""'::jsonb END,
  'contact.email', CASE WHEN "content"->>'contact.email' = 'admin@materialsquare.in' THEN '""'::jsonb END,
  'contact.officeAddress', CASE WHEN "content"->>'contact.officeAddress' = '192, Prakash Industrial Estate, Sahibabad, Ghaziabad, Uttar Pradesh' THEN '""'::jsonb END,
  'contact.mapUrl', CASE WHEN "content"->>'contact.mapUrl' = 'https://maps.app.goo.gl/sPj9Ai7rZpLMPKh36' THEN '""'::jsonb END
)),
"updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('global', 'draft')
  AND jsonb_typeof("content") = 'object'
  AND (
    "content"->>'contact.phone' = '7735527252'
    OR "content"->>'contact.phoneDisplay' = '+91 77355 27252'
    OR "content"->>'contact.whatsappPhone' = '7735527252'
    OR "content"->>'contact.email' = 'admin@materialsquare.in'
    OR "content"->>'contact.officeAddress' = '192, Prakash Industrial Estate, Sahibabad, Ghaziabad, Uttar Pradesh'
    OR "content"->>'contact.mapUrl' = 'https://maps.app.goo.gl/sPj9Ai7rZpLMPKh36'
  );

-- Once staging contact details are removed, keep stored policies unpublished
-- until staff configure the contact details that the policy text can display.
UPDATE "website_content"
SET "content" = jsonb_set("content", '{policy.privacy}', to_jsonb(jsonb_set(pg_temp.try_jsonb("content"->>'policy.privacy'), '{published}', 'false'::jsonb, false)::text), false),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('global', 'draft') AND (
    (COALESCE("content"->>'contact.email', '') = '' AND pg_temp.policy_uses_contact("content"->>'policy.privacy', '{{contactEmail}}'))
    OR (COALESCE("content"->>'contact.phone', '') = '' AND pg_temp.policy_uses_contact("content"->>'policy.privacy', '{{contactPhone}}'))
  )
  AND jsonb_typeof(pg_temp.try_jsonb("content"->>'policy.privacy')) = 'object' AND pg_temp.try_jsonb("content"->>'policy.privacy')->>'published' = 'true';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{policy.terms}', to_jsonb(jsonb_set(pg_temp.try_jsonb("content"->>'policy.terms'), '{published}', 'false'::jsonb, false)::text), false),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('global', 'draft') AND (
    (COALESCE("content"->>'contact.email', '') = '' AND pg_temp.policy_uses_contact("content"->>'policy.terms', '{{contactEmail}}'))
    OR (COALESCE("content"->>'contact.phone', '') = '' AND pg_temp.policy_uses_contact("content"->>'policy.terms', '{{contactPhone}}'))
  )
  AND jsonb_typeof(pg_temp.try_jsonb("content"->>'policy.terms')) = 'object' AND pg_temp.try_jsonb("content"->>'policy.terms')->>'published' = 'true';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{policy.shipping}', to_jsonb(jsonb_set(pg_temp.try_jsonb("content"->>'policy.shipping'), '{published}', 'false'::jsonb, false)::text), false),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('global', 'draft') AND (
    (COALESCE("content"->>'contact.email', '') = '' AND pg_temp.policy_uses_contact("content"->>'policy.shipping', '{{contactEmail}}'))
    OR (COALESCE("content"->>'contact.phone', '') = '' AND pg_temp.policy_uses_contact("content"->>'policy.shipping', '{{contactPhone}}'))
  )
  AND jsonb_typeof(pg_temp.try_jsonb("content"->>'policy.shipping')) = 'object' AND pg_temp.try_jsonb("content"->>'policy.shipping')->>'published' = 'true';

UPDATE "website_content"
SET "content" = jsonb_set("content", '{policy.returns}', to_jsonb(jsonb_set(pg_temp.try_jsonb("content"->>'policy.returns'), '{published}', 'false'::jsonb, false)::text), false),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('global', 'draft') AND (
    (COALESCE("content"->>'contact.email', '') = '' AND pg_temp.policy_uses_contact("content"->>'policy.returns', '{{contactEmail}}'))
    OR (COALESCE("content"->>'contact.phone', '') = '' AND pg_temp.policy_uses_contact("content"->>'policy.returns', '{{contactPhone}}'))
  )
  AND jsonb_typeof(pg_temp.try_jsonb("content"->>'policy.returns')) = 'object' AND pg_temp.try_jsonb("content"->>'policy.returns')->>'published' = 'true';

-- Refresh only the exact outdated default sentences. This preserves policy
-- text edited by staff while bringing saved copies of the defaults in line
-- with the current session and shipping behavior.
UPDATE "website_content"
SET "content" = jsonb_set(
  "content",
  '{policy.privacy}',
  to_jsonb(replace(
    replace(
      replace(
        "content"->>'policy.privacy',
        'Sessions expire after about one year and may be renewed while you use the account.',
        'Sessions expire after 90 days without activity and may be renewed while you use the account.'
      ),
      'Session records have an expiry of about one year.',
      'Inactive customer session records expire after 90 days.'
    ),
    'contact {{contactEmail}} or +91 77355 27252.',
    'contact {{contactEmail}} or {{contactPhone}}.'
  )),
  false
),
"updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('global', 'draft')
  AND (
    COALESCE("content"->>'policy.privacy', '') LIKE '%Sessions expire after about one year and may be renewed while you use the account.%'
    OR COALESCE("content"->>'policy.privacy', '') LIKE '%Session records have an expiry of about one year.%'
    OR COALESCE("content"->>'policy.privacy', '') LIKE '%contact {{contactEmail}} or +91 77355 27252.%'
  );

UPDATE "website_content"
SET "content" = jsonb_set(
  "content",
  '{policy.shipping}',
  to_jsonb(replace(
    replace(
      "content"->>'policy.shipping',
      'Shipping charges are calculated at checkout. Delivery details are confirmed for each order.',
      'Shipping charges and delivery details are confirmed on the quotation or order.'
    ),
    'Shipping charges are calculated at checkout and can depend on the products, quantities and delivery location. The team confirms the final delivery details with your order.',
    'Shipping charges depend on the products, quantities and delivery location. The team confirms charges and final delivery details on your quotation or order.'
  )),
  false
),
"updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('global', 'draft')
  AND COALESCE("content"->>'policy.shipping', '') LIKE '%Shipping charges are calculated at checkout%';

-- The privacy default receives its contact-phone placeholder in this
-- migration, after staging contacts were cleared by migration 004.
CREATE OR REPLACE FUNCTION pg_temp.try_jsonb(value text) RETURNS jsonb AS $$
BEGIN
  RETURN value::jsonb;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE "website_content"
SET "content" = jsonb_set(
  "content",
  '{policy.privacy}',
  to_jsonb(jsonb_set(
    pg_temp.try_jsonb("content"->>'policy.privacy'),
    '{published}',
    'false'::jsonb,
    false
  )::text),
  false
),
"updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('global', 'draft')
  AND COALESCE("content"->>'contact.phone', '') = ''
  AND COALESCE("content"->>'policy.privacy', '') LIKE '%{{contactPhone}}%'
  AND jsonb_typeof(pg_temp.try_jsonb("content"->>'policy.privacy')) = 'object'
  AND pg_temp.try_jsonb("content"->>'policy.privacy')->>'published' = 'true';

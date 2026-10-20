-- Correct policies that were published under legacy defaults or contain
-- contact placeholders while the corresponding contact setting is empty.
-- This is additive so environments that already applied migration 004 remain
-- valid and receive the correction without a migration checksum change.
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
  IF jsonb_typeof(policy) IS DISTINCT FROM 'object' THEN
    RETURN false;
  END IF;
  IF position(placeholder IN COALESCE(policy->>'title', '') || ' ' || COALESCE(policy->>'notice', '')) > 0 THEN
    RETURN true;
  END IF;
  IF jsonb_typeof(policy->'sections') IS DISTINCT FROM 'array' THEN
    RETURN false;
  END IF;
  FOR section IN SELECT item.value FROM jsonb_array_elements(policy->'sections') AS item(value) LOOP
    IF position(placeholder IN COALESCE(section->>'heading', '') || ' ' || COALESCE(section->>'body', '')) > 0 THEN
      RETURN true;
    END IF;
  END LOOP;
  RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DO $migration$
DECLARE
  policy_key text;
BEGIN
  FOREACH policy_key IN ARRAY ARRAY['policy.privacy', 'policy.terms', 'policy.shipping', 'policy.returns'] LOOP
    UPDATE "website_content" AS site
    SET "content" = jsonb_set(
      site."content",
      ARRAY[policy_key],
      to_jsonb(jsonb_set(pg_temp.try_jsonb(site."content"->>policy_key), '{published}', 'false'::jsonb, false)::text),
      false
    ),
    "updatedAt" = CURRENT_TIMESTAMP
    WHERE site."id" IN ('global', 'draft')
      AND jsonb_typeof(site."content") = 'object'
      AND jsonb_typeof(pg_temp.try_jsonb(site."content"->>policy_key)) = 'object'
      AND pg_temp.try_jsonb(site."content"->>policy_key)->>'published' = 'true'
      AND (
        (COALESCE(site."content"->>'contact.email', '') = '' AND pg_temp.policy_uses_contact(site."content"->>policy_key, '{{contactEmail}}'))
        OR (COALESCE(site."content"->>'contact.phone', '') = '' AND pg_temp.policy_uses_contact(site."content"->>policy_key, '{{contactPhone}}'))
      );
  END LOOP;
END
$migration$;

-- Unpublish only exact legacy defaults. Edited policy text is preserved for
-- staff review, including any policy whose wording changed after the defaults.
UPDATE "website_content" AS site
SET "content" = jsonb_set(
  site."content",
  ARRAY['policy.shipping'],
  to_jsonb(jsonb_set(pg_temp.try_jsonb(site."content"->>'policy.shipping'), '{published}', 'false'::jsonb, false)::text),
  false
),
"updatedAt" = CURRENT_TIMESTAMP
WHERE site."id" IN ('global', 'draft')
  AND jsonb_typeof(site."content") = 'object'
  AND pg_temp.try_jsonb(site."content"->>'policy.shipping') = $$
    {
      "title": "Shipping Policy",
      "notice": "Shipping charges and delivery details are confirmed on the quotation or order.",
      "published": true,
      "sections": [
        { "heading": "Shipping charges", "body": "Shipping charges depend on the products, quantities and delivery location. The team confirms charges and final delivery details on your quotation or order." },
        { "heading": "Delivery timing and availability", "body": "Delivery availability and timing depend on the requested products and delivery location. Material Square staff will confirm the delivery plan before an order is finalised." },
        { "heading": "Need help?", "body": "For a delivery estimate or location-specific question, contact Material Square with your quotation or order reference and delivery PIN code." }
      ],
      "reviewNote": "Review shipping charges, service areas, delivery times and order workflow before publishing this policy."
    }
  $$::jsonb;

-- The prior terms default was also published without a verified review.
-- Its unchanged review note identifies copies still awaiting legal launch review.
UPDATE "website_content" AS site
SET "content" = jsonb_set(
  site."content",
  ARRAY['policy.terms'],
  to_jsonb(jsonb_set(pg_temp.try_jsonb(site."content"->>'policy.terms'), '{published}', 'false'::jsonb, false)::text),
  false
),
"updatedAt" = CURRENT_TIMESTAMP
WHERE site."id" IN ('global', 'draft')
  AND jsonb_typeof(site."content") = 'object'
  AND pg_temp.try_jsonb(site."content"->>'policy.terms')->>'title' = 'Terms and Conditions'
  AND pg_temp.try_jsonb(site."content"->>'policy.terms')->>'notice' = 'Last updated 8 October 2026'
  AND pg_temp.try_jsonb(site."content"->>'policy.terms')->>'published' = 'true'
  AND pg_temp.try_jsonb(site."content"->>'policy.terms')->>'reviewNote' = 'Before production launch, confirm legal operator identity/principal address, appointed grievance officer name/designation and contact, exact seller/marketplace role, order acceptance flow, GST/tax disclosures, stock and delivery process, cancellation/returns/refund/warranty terms, and counsel review. Copy is published only to localhost at this stage; do not treat it as a guarantee of legal compliance.';

UPDATE "website_content" AS site
SET "content" = jsonb_set(
  site."content",
  ARRAY['policy.returns'],
  to_jsonb(jsonb_set(pg_temp.try_jsonb(site."content"->>'policy.returns'), '{published}', 'false'::jsonb, false)::text),
  false
),
"updatedAt" = CURRENT_TIMESTAMP
WHERE site."id" IN ('global', 'draft')
  AND jsonb_typeof(site."content") = 'object'
  AND pg_temp.try_jsonb(site."content"->>'policy.returns') = $$
    {
      "title": "Return Policy",
      "notice": "Return and replacement requests are reviewed with the Material Square team for each order.",
      "published": true,
      "sections": [
        { "heading": "Requesting a return or replacement", "body": "Contact Material Square before sending any item back. Share your quotation or order reference, the product and quantity, and the reason for your request. If an item is damaged or incorrect, include clear photos where possible." },
        { "heading": "Review and next steps", "body": "Return or replacement eligibility can depend on the product, its condition and the applicable supplier terms. The team will review the order and confirm the available next steps and return instructions." },
        { "heading": "Contact us", "body": "Please do not dispatch an item until the team has confirmed the return process and destination. Contact Material Square with your quotation or order reference to begin a review." }
      ],
      "reviewNote": "Confirm product-specific eligibility, timelines, freight responsibility, refund method and statutory consumer rights before production use."
    }
  $$::jsonb;

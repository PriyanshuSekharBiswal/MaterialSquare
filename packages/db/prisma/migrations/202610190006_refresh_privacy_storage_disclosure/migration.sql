-- Refresh only untouched copies of the old privacy defaults. Any saved copy
-- changed by this migration stays unpublished for staff/legal review.
CREATE OR REPLACE FUNCTION pg_temp.try_jsonb(value text) RETURNS jsonb AS $$
BEGIN
  RETURN value::jsonb;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

WITH source AS (
  SELECT "id", "content"->>'policy.privacy' AS policy_text
  FROM "website_content"
  WHERE "id" IN ('global', 'draft')
    AND COALESCE("content"->>'policy.privacy', '') LIKE '%Guest material lists and browser storage%'
    AND strpos(
      COALESCE("content"->>'policy.privacy', ''),
      $$You can browse without signing in. A guest material list is kept in this browser’s local storage under the key material-square-bom; it can include selected product names, identifiers, brand, unit, quantity, specifications and options. It is not sent to the server just by being kept in the list. Clearing this site’s browser storage removes that local list. The site also uses the essential customer-session cookie described above. The current application code does not include an advertising pixel or third-party behavioural advertising analytics. Your browser or hosting provider may still keep ordinary technical logs.$$
    ) > 0
), revised AS (
  SELECT "id", policy_text,
    replace(
      replace(
        replace(
          policy_text,
          $$Guest material lists and browser storage$$,
          $$Cookies and similar browser storage$$
        ),
        $$You can browse without signing in. A guest material list is kept in this browser’s local storage under the key material-square-bom; it can include selected product names, identifiers, brand, unit, quantity, specifications and options. It is not sent to the server just by being kept in the list. Clearing this site’s browser storage removes that local list. The site also uses the essential customer-session cookie described above. The current application code does not include an advertising pixel or third-party behavioural advertising analytics. Your browser or hosting provider may still keep ordinary technical logs.$$,
        $$The customer website uses the essential ms_customer_session cookie only after customer sign-in. It is an HttpOnly, SameSite=Lax cookie scoped to /api and marked Secure in production; it keeps the signed-in session and is not used for advertising. The staff workspace separately uses an HttpOnly ms_staff_session cookie with the same path and security attributes; staff sessions expire after 12 hours. You can remove either cookie by signing out or clearing this site’s browser data, though account features then require sign-in again. The site does not set an advertising or analytics cookie. To keep features working, local storage on the customer site holds the active material list under material-square-bom and saved-for-later items under material-square-bom-saved. These lists can contain selected product/option identifiers, product names, brands, quantities, units and specifications. They stay in the browser until removed or browser storage is cleared; they are not sent to the server merely by being stored. Session storage keeps temporary scroll positions and a marketplace result count for the current tab session. The staff workspace may keep local editor recovery drafts and a selected editor section in that staff browser; avoid using a shared device for staff work and clear its browser data when appropriate. When phone verification is started, the MSG91 verification widget is loaded from MSG91; its own browser storage and cookie practices are governed by MSG91 and should be confirmed against the provider’s current documentation before publication. You can control or clear browser storage through your browser settings; disabling it may prevent material lists, session continuity or editor recovery from working.$$ 
      ),
      $$The website records aggregate counts by day for page views, product views, material-list additions and clicks that hand off an enquiry to WhatsApp or email. These counters record the event type and an allowed page or product target; they are not linked to a visitor account and do not contain the saved list, search text, name or phone number. For service security and abuse prevention, the API may temporarily use a request IP address and API path in an in-memory rate limiter, and hosting or infrastructure providers may create server, diagnostic or security logs. Staff activity and security records can include staff account, action, time and related record or request metadata.$$,
      $$The website records aggregate counts by day for page views, product views, material-list additions and clicks that hand off an enquiry to WhatsApp or email. These counters record the event type and an allowed page or product target; they are not linked to a visitor account and do not contain the saved list, search text, name or phone number. Analytics counters currently have no automatic deletion schedule. For service security and abuse prevention, the API stores short-lived rate-limit counters in the database. It uses keyed HMAC digests of the request IP and route, and, for staff login, the normalized login identifier; the raw IP and login identifier are not stored in those counters. Rate-limit buckets expire after a 15-minute window and expired rows are cleaned up periodically. Hosting or infrastructure providers may also create server, diagnostic or security logs under their own retention practices. Staff activity and security records can include staff account, action, time and related record or request metadata.$$ 
    ) AS revised_text
  FROM source
), parsed AS (
  SELECT "id", policy_text, revised_text, pg_temp.try_jsonb(revised_text) AS policy
  FROM revised
  WHERE revised_text <> policy_text
)
UPDATE "website_content" AS content
SET "content" = jsonb_set(
      content."content",
      '{policy.privacy}',
      to_jsonb(jsonb_set(
        jsonb_set(parsed.policy, '{published}', 'false'::jsonb, false),
        '{notice}',
        '"Last updated 19 October 2026"'::jsonb,
        false
      )::text),
      false
    ),
    "updatedAt" = CURRENT_TIMESTAMP
FROM parsed
WHERE content."id" = parsed."id"
  AND jsonb_typeof(parsed.policy) = 'object';

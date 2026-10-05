-- Use the owner's current testing contact details and verified Sahibabad office location.
-- This is the active staging/test configuration; update it to client-approved values before handoff.
UPDATE "website_content"
SET "content" = "content" || '{
  "contact.phone": "7735527252",
  "contact.phoneDisplay": "+91 77355 27252",
  "contact.email": "admin@materialsquare.in",
  "contact.officeName": "Material Square",
  "contact.officeAddress": "192, Prakash Industrial Estate, Sahibabad, Ghaziabad, Uttar Pradesh",
  "contact.mapUrl": "https://maps.app.goo.gl/sPj9Ai7rZpLMPKh36"
}'::jsonb,
"updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'global';

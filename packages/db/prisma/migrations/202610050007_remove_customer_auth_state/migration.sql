-- Customers remain internal CRM contacts. Remove fields and tables used only
-- by the retired customer account, saved-list, and OTP sign-in flows.
DROP TABLE IF EXISTS "customer_sessions";
DROP TABLE IF EXISTS "otp_sessions";

ALTER TABLE "customers"
  DROP COLUMN IF EXISTS "materialList",
  DROP COLUMN IF EXISTS "listVersion",
  DROP COLUMN IF EXISTS "lastLoginAt";

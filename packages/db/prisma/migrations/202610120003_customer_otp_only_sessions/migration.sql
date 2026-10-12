-- Customer access is verified by mobile OTP only. Remove unused legacy
-- password credentials and the session flag that could imply another flow.
ALTER TABLE "customers"
  DROP COLUMN IF EXISTS "passwordHash";

ALTER TABLE "customer_sessions"
  DROP COLUMN IF EXISTS "passwordAuthenticated";

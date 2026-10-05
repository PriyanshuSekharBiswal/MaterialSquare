-- Account access has been retired. Keep operational quote/order records intact,
-- unlink them from deleted accounts, and remove credentials, profile data, and
-- account sessions.
ALTER TABLE "orders" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "orders" DROP CONSTRAINT "orders_customerId_fkey";
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

DELETE FROM "staff_users";
ALTER TABLE "staff_users" DROP COLUMN "passwordHash";
DELETE FROM "otp_sessions";
DELETE FROM "customers";

DROP TABLE IF EXISTS "demo_bootstrap_state";

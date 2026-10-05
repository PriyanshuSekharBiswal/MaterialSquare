-- Customer sign-in is retired, but CRM records and staff accounts must remain
-- available while the staging release is tested. Remove only the obsolete
-- customer OTP state here; client handover cleanup is a separate operation.
ALTER TABLE "orders" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "orders" DROP CONSTRAINT "orders_customerId_fkey";
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

DELETE FROM "otp_sessions";

DROP TABLE IF EXISTS "demo_bootstrap_state";

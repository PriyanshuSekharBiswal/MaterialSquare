DROP INDEX IF EXISTS "staff_enquiries_isDemo_status_updatedAt_idx";
ALTER TABLE "staff_users" DROP COLUMN IF EXISTS "isDemo";
ALTER TABLE "customers" DROP COLUMN IF EXISTS "isDemo";
ALTER TABLE "otp_sessions" DROP COLUMN IF EXISTS "isDemo";
ALTER TABLE "staff_enquiries" DROP COLUMN IF EXISTS "isDemo";
CREATE INDEX IF NOT EXISTS "staff_enquiries_status_updatedAt_idx"
  ON "staff_enquiries"("status", "updatedAt");

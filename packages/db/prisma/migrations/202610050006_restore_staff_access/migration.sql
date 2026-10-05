-- Keep existing staging credentials and ensure older schemas have the field.
ALTER TABLE "staff_users"
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "staff_users"
  ALTER COLUMN "passwordHash" DROP DEFAULT;

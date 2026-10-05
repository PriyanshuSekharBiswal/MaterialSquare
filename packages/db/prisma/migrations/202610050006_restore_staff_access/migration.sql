-- Staff access is required for the client workspace. Customer sign-in remains
-- retired; the previous migration intentionally removed all old staff rows.
ALTER TABLE "staff_users"
  ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "staff_users"
  ALTER COLUMN "passwordHash" DROP DEFAULT;

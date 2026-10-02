ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'CATALOG_MANAGER';
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'CONTENT_MANAGER';

ALTER TABLE "staff_users" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "staff_users" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "customers"
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

UPDATE "customers" AS customer
SET "lastLoginAt" = sessions."createdAt"
FROM (
  SELECT "customerId", MAX("createdAt") AS "createdAt"
  FROM "customer_sessions"
  GROUP BY "customerId"
) AS sessions
WHERE customer."id" = sessions."customerId";

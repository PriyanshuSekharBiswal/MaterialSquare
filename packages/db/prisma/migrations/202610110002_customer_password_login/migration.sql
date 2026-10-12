ALTER TABLE "customers"
ADD COLUMN "passwordHash" TEXT;

ALTER TABLE "customer_sessions"
ADD COLUMN "passwordAuthenticated" BOOLEAN NOT NULL DEFAULT false;

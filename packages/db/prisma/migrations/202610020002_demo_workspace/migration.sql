ALTER TABLE "staff_users" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "staff_users_phone_key" ON "staff_users"("phone");
ALTER TABLE "customers" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "otp_sessions" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "staff_enquiries" (
  "id" TEXT NOT NULL, "customerName" TEXT NOT NULL, "phone" TEXT NOT NULL,
  "email" TEXT NOT NULL DEFAULT '', "siteAddress" TEXT NOT NULL DEFAULT '',
  "city" TEXT NOT NULL DEFAULT '', "pincode" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'NEW',
  "materials" JSONB NOT NULL DEFAULT '[]', "notes" TEXT NOT NULL DEFAULT '',
  "isDemo" BOOLEAN NOT NULL DEFAULT false, "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "staff_enquiries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "staff_enquiries_isDemo_status_updatedAt_idx" ON "staff_enquiries"("isDemo", "status", "updatedAt");

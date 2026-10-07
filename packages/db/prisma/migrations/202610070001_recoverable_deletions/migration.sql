ALTER TABLE "staff_users" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "catalog_listings" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "suppliers" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "supplier_products" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "recently_deleted_records" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "deletedById" TEXT NOT NULL,
    "deletedByName" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "restoredAt" TIMESTAMP(3),
    "restoredById" TEXT,
    "restoredByName" TEXT,
    "metadata" JSONB,
    CONSTRAINT "recently_deleted_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recently_deleted_records_expiresAt_idx"
  ON "recently_deleted_records"("expiresAt");
CREATE INDEX "recently_deleted_records_entityType_restoredAt_deletedAt_idx"
  ON "recently_deleted_records"("entityType", "restoredAt", "deletedAt");
CREATE INDEX "recently_deleted_records_entityId_deletedAt_idx"
  ON "recently_deleted_records"("entityId", "deletedAt");

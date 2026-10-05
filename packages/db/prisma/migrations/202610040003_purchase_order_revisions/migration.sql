ALTER TABLE "purchase_orders" ADD COLUMN "revisionNumber" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "revisionHistory" JSONB NOT NULL DEFAULT '[]';

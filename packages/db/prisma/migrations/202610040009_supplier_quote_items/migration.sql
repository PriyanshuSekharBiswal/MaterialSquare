ALTER TABLE "supplier_quotes"
ADD COLUMN "items" JSONB NOT NULL DEFAULT '[]';

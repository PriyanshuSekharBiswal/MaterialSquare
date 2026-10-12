ALTER TABLE "suppliers"
ADD COLUMN "brandCatalog" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "discount_rules"
ADD COLUMN "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "discount_rules"
SET "categories" = ARRAY["category"]
WHERE "category" IS NOT NULL AND "category" <> '';

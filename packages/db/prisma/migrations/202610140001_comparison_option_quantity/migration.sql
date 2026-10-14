ALTER TABLE "quotation_item_options"
ADD COLUMN "quantityMt" DECIMAL(12, 3);

UPDATE "quotation_item_options" AS quote_option
SET "quantityMt" = item."quantityMt"
FROM "quotation_items" AS item
WHERE quote_option."quotationItemId" = item."id";

ALTER TABLE "quotation_item_options"
ALTER COLUMN "quantityMt" SET NOT NULL;

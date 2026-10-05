ALTER TABLE "quotations"
ADD COLUMN "marginPct" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
ADD COLUMN "taxPct" DECIMAL(5,2) NOT NULL DEFAULT 18.0;

UPDATE "quotations"
SET "marginPct" = CASE
    WHEN "subtotal" - "discountAmount" = 0 THEN 0
    ELSE ROUND(("marginAmount" / ("subtotal" - "discountAmount")) * 100, 2)
  END,
  "taxPct" = CASE
    WHEN "subtotal" + "marginAmount" - "discountAmount" = 0 THEN 0
    ELSE ROUND(("taxAmount" / ("subtotal" + "marginAmount" - "discountAmount")) * 100, 2)
  END;

ALTER TABLE "quotation_items"
ADD COLUMN "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.0;

CREATE TABLE "quotation_item_options" (
    "id" TEXT NOT NULL,
    "quotationItemId" TEXT NOT NULL,
    "productId" TEXT,
    "catalogueId" TEXT,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "specification" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.0,

    CONSTRAINT "quotation_item_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quotation_item_options_quotationItemId_idx"
ON "quotation_item_options"("quotationItemId");

ALTER TABLE "quotation_item_options"
ADD CONSTRAINT "quotation_item_options_quotationItemId_fkey"
FOREIGN KEY ("quotationItemId") REFERENCES "quotation_items"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quotation_item_options"
ADD CONSTRAINT "quotation_item_options_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "product_skus"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "rfqs" ADD COLUMN "requestNumber" TEXT;
ALTER TABLE "supplier_quotes" ADD COLUMN "supplierQuoteNumber" TEXT;

WITH numbered AS (
  SELECT
    "id",
    "createdAt",
    ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata' AS kolkata_time,
    ROW_NUMBER() OVER (
      PARTITION BY date_trunc('milliseconds', "createdAt")
      ORDER BY "id"
    ) AS sequence
  FROM "rfqs"
)
UPDATE "rfqs" AS target
SET "requestNumber" = concat(
  'MS-RF-',
  to_char(numbered.kolkata_time, 'YYYY'), '-',
  translate(to_char(numbered.kolkata_time, 'MMDD'), '0123456789', '0abcdefghi'), '-',
  translate(to_char(numbered.kolkata_time, 'HH24MISS'), '0123456789', '0abcdefghi'), '-',
  translate(lpad((extract(milliseconds FROM numbered."createdAt")::integer % 1000)::text, 3, '0'), '0123456789', '0abcdefghi'), '-',
  translate(lpad(numbered.sequence::text, 2, '0'), '0123456789', '0abcdefghi')
)
FROM numbered
WHERE target."id" = numbered."id";

WITH numbered AS (
  SELECT
    "id",
    "createdAt",
    ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata' AS kolkata_time,
    ROW_NUMBER() OVER (
      PARTITION BY date_trunc('milliseconds', "createdAt")
      ORDER BY "id"
    ) AS sequence
  FROM "supplier_quotes"
)
UPDATE "supplier_quotes" AS target
SET "supplierQuoteNumber" = concat(
  'MS-SQ-',
  to_char(numbered.kolkata_time, 'YYYY'), '-',
  translate(to_char(numbered.kolkata_time, 'MMDD'), '0123456789', '0abcdefghi'), '-',
  translate(to_char(numbered.kolkata_time, 'HH24MISS'), '0123456789', '0abcdefghi'), '-',
  translate(lpad((extract(milliseconds FROM numbered."createdAt")::integer % 1000)::text, 3, '0'), '0123456789', '0abcdefghi'), '-',
  translate(lpad(numbered.sequence::text, 2, '0'), '0123456789', '0abcdefghi')
)
FROM numbered
WHERE target."id" = numbered."id";

ALTER TABLE "rfqs" ALTER COLUMN "requestNumber" SET NOT NULL;
ALTER TABLE "supplier_quotes" ALTER COLUMN "supplierQuoteNumber" SET NOT NULL;

CREATE UNIQUE INDEX "rfqs_requestNumber_key" ON "rfqs"("requestNumber");
CREATE UNIQUE INDEX "supplier_quotes_supplierQuoteNumber_key" ON "supplier_quotes"("supplierQuoteNumber");

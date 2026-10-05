CREATE TYPE "OrderStatus_new" AS ENUM (
  'PROCESSING_AT_YARD',
  'LOADED_ON_TRUCK',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'CANCELLED'
);

ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "orders"
  ALTER COLUMN "status" TYPE "OrderStatus_new"
  USING (
    CASE
      WHEN "status"::text IN ('PENDING_PAYMENT', 'PAYMENT_CONFIRMED')
        THEN 'PROCESSING_AT_YARD'
      ELSE "status"::text
    END
  )::"OrderStatus_new";

ALTER TABLE "orders"
  ALTER COLUMN "status" SET DEFAULT 'PROCESSING_AT_YARD';

DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

ALTER TABLE "orders"
  DROP COLUMN "paidAmount",
  DROP COLUMN "paymentMode";

ALTER TABLE "commission_records"
  DROP COLUMN "paidAt";

UPDATE "website_content"
SET "content" = jsonb_set(
  "content",
  '{policy.terms}',
  to_jsonb(
    replace(
      replace(
        "content" ->> 'policy.terms',
        'accepted quotation, payment, or delivery booking',
        'accepted quotation or delivery booking'
      ),
      'delivery, return, or payment.',
      'delivery, or return.'
    )
  ),
  false
)
WHERE "content" ? 'policy.terms'
  AND jsonb_typeof("content" -> 'policy.terms') = 'string';

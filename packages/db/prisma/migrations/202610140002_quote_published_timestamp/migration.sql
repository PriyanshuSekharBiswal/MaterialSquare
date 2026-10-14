ALTER TABLE "quotations"
ADD COLUMN "publishedAt" TIMESTAMP(3);

UPDATE "quotations"
SET "publishedAt" = (
  SELECT MIN("audit_logs"."createdAt")
  FROM "audit_logs"
  WHERE "audit_logs"."entityType" = 'QUOTATION'
    AND "audit_logs"."entityId" = "quotations"."id"
    AND "audit_logs"."action" = 'QUOTATION_PUBLISHED'
)
WHERE EXISTS (
  SELECT 1
  FROM "audit_logs"
  WHERE "audit_logs"."entityType" = 'QUOTATION'
    AND "audit_logs"."entityId" = "quotations"."id"
    AND "audit_logs"."action" = 'QUOTATION_PUBLISHED'
);

UPDATE "quotations"
SET "publishedAt" = "updatedAt"
WHERE "publishedAt" IS NULL
  AND "status" IN (
    'QUOTE_SENT',
    'ACCEPTED',
    'CONVERTED_TO_ORDER',
    'EXPIRED',
    'REJECTED'
  );

ALTER TABLE "transportation_plans"
ADD COLUMN "recipientName" TEXT;

ALTER TABLE "transportation_plans"
ADD COLUMN "recipientPhone" TEXT;

ALTER TABLE "transportation_plans"
ADD COLUMN "createdById" TEXT;

UPDATE "transportation_plans" AS plan
SET "createdById" = (
  SELECT log."staffId"
  FROM "audit_logs" AS log
  WHERE log."action" = 'TRANSPORTATION_PLAN_CREATED'
    AND log."entityType" = 'ORDER'
    AND log."entityId" = plan."orderId"
    AND log."staffId" IS NOT NULL
  ORDER BY log."createdAt" ASC
  LIMIT 1
);

CREATE INDEX "transportation_plans_createdById_idx"
ON "transportation_plans"("createdById");

ALTER TABLE "transportation_plans"
ADD CONSTRAINT "transportation_plans_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "staff_users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

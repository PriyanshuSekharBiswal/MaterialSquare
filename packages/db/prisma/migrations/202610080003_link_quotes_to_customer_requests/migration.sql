ALTER TABLE "quotations"
ADD COLUMN "requestId" TEXT;

CREATE INDEX "quotations_requestId_idx" ON "quotations"("requestId");

ALTER TABLE "quotations"
ADD CONSTRAINT "quotations_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "rfqs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

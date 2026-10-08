CREATE TABLE "rfq_attachments" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rfq_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rfq_attachments_rfqId_createdAt_idx" ON "rfq_attachments"("rfqId", "createdAt");

ALTER TABLE "rfq_attachments"
ADD CONSTRAINT "rfq_attachments_rfqId_fkey"
FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rfq_attachments"
ADD COLUMN "storageKey" TEXT;

-- Keep existing database-stored attachments readable while new uploads use S3.
ALTER TABLE "rfq_attachments"
ALTER COLUMN "content" DROP NOT NULL;

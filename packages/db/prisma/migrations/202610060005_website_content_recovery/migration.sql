CREATE TABLE "website_content_revisions" (
    "id" TEXT NOT NULL,
    "staffId" TEXT,
    "content" JSONB NOT NULL,
    "changedFields" JSONB NOT NULL,
    "saveType" TEXT NOT NULL DEFAULT 'AUTOSAVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "website_content_revisions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "website_content_revisions_staffId_fkey"
      FOREIGN KEY ("staffId") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "website_content_revisions_expiresAt_idx"
  ON "website_content_revisions"("expiresAt");
CREATE INDEX "website_content_revisions_createdAt_id_idx"
  ON "website_content_revisions"("createdAt", "id");

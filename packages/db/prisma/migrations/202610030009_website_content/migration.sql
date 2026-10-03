CREATE TABLE "website_content" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "content" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_content_pkey" PRIMARY KEY ("id")
);

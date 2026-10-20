CREATE TABLE "api_rate_limit_buckets" (
    "key" VARCHAR(64) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "api_rate_limit_buckets_expiresAt_idx"
ON "api_rate_limit_buckets"("expiresAt");

CREATE TABLE "catalog_listings" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "brandTagline" TEXT,
    "category" TEXT NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "packaging" TEXT,
    "image" TEXT,
    "grade" TEXT,
    "description" TEXT,
    "minOrderQty" TEXT,
    "dispatchTime" TEXT,
    "price" DECIMAL(12,2),
    "compareAtPrice" DECIMAL(12,2),
    "priceNote" TEXT,
    "offerLabel" TEXT,
    "isInStock" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "applications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "specifications" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_listings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catalog_listings_slug_key" ON "catalog_listings"("slug");
CREATE UNIQUE INDEX "catalog_listings_code_key" ON "catalog_listings"("code");
CREATE INDEX "catalog_listings_isPublished_category_sortOrder_idx"
    ON "catalog_listings"("isPublished", "category", "sortOrder");

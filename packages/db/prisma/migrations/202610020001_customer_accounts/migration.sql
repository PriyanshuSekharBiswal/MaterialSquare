ALTER TABLE "customers" ADD COLUMN "city" TEXT NOT NULL DEFAULT '', ADD COLUMN "materialList" JSONB NOT NULL DEFAULT '[]', ADD COLUMN "listVersion" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "customer_sessions" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "customerId" TEXT NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "customer_sessions_customerId_idx" ON "customer_sessions"("customerId");
CREATE INDEX "customer_sessions_expiresAt_idx" ON "customer_sessions"("expiresAt");

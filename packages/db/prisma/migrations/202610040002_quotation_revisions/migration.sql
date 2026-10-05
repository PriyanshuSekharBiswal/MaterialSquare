ALTER TABLE "quotations" ADD COLUMN "revisedFromId" TEXT, ADD COLUMN "revisionNumber" INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX "quotations_revisedFromId_key" ON "quotations"("revisedFromId");

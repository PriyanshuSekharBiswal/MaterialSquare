ALTER TABLE "rfqs"
  ADD COLUMN "assignedStaffId" TEXT,
  ADD COLUMN "staffNotes" TEXT;

CREATE INDEX "rfqs_assignedStaffId_status_createdAt_idx"
  ON "rfqs"("assignedStaffId", "status", "createdAt");

ALTER TABLE "rfqs"
  ADD CONSTRAINT "rfqs_assignedStaffId_fkey"
  FOREIGN KEY ("assignedStaffId") REFERENCES "staff_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

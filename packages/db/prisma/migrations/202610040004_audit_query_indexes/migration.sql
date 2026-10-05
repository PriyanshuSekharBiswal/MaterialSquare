-- Support audit chronology and the exact entity/action filters exposed in admin.
CREATE INDEX "audit_logs_createdAt_id_idx" ON "audit_logs"("createdAt", "id");
CREATE INDEX "audit_logs_entityId_createdAt_id_idx" ON "audit_logs"("entityId", "createdAt", "id");
CREATE INDEX "audit_logs_action_createdAt_id_idx" ON "audit_logs"("action", "createdAt", "id");

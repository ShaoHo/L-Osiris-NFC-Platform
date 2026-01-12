-- CreateTable
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "actor" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "payload" JSONB,
  "adminActionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Indexes required by schema (except deletedAt/purgeAfter which are added later by soft delete migration)
CREATE INDEX "AuditLog_eventType_idx" ON "AuditLog"("eventType");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_adminActionId_idx" ON "AuditLog"("adminActionId");

-- Foreign key to AdminAction
ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_adminActionId_fkey"
FOREIGN KEY ("adminActionId") REFERENCES "AdminAction"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

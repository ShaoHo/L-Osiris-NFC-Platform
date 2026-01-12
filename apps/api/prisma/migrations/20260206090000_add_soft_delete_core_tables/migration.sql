ALTER TABLE "Curator"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

ALTER TABLE "CuratorPolicy"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

ALTER TABLE "ViewerProfile"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

ALTER TABLE "ViewerSession"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

ALTER TABLE "ViewerExhibitionState"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

ALTER TABLE "AccessGrant"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

ALTER TABLE "AdminAction"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

ALTER TABLE "AuditLog"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

ALTER TABLE "User"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

ALTER TABLE "Role"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

ALTER TABLE "UserRole"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

ALTER TABLE "Exhibit"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

ALTER TABLE "ExhibitionDayContent"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

ALTER TABLE "ExhibitionDayAsset"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

ALTER TABLE "AiGenerationJob"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

ALTER TABLE "MarketingOutboxEvent"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAfter" TIMESTAMP(3);

CREATE INDEX "Curator_deletedAt_idx" ON "Curator"("deletedAt");
CREATE INDEX "Curator_purgeAfter_idx" ON "Curator"("purgeAfter");
CREATE INDEX "CuratorPolicy_deletedAt_idx" ON "CuratorPolicy"("deletedAt");
CREATE INDEX "CuratorPolicy_purgeAfter_idx" ON "CuratorPolicy"("purgeAfter");
CREATE INDEX "ViewerProfile_deletedAt_idx" ON "ViewerProfile"("deletedAt");
CREATE INDEX "ViewerProfile_purgeAfter_idx" ON "ViewerProfile"("purgeAfter");
CREATE INDEX "ViewerSession_deletedAt_idx" ON "ViewerSession"("deletedAt");
CREATE INDEX "ViewerSession_purgeAfter_idx" ON "ViewerSession"("purgeAfter");
CREATE INDEX "ViewerExhibitionState_deletedAt_idx" ON "ViewerExhibitionState"("deletedAt");
CREATE INDEX "ViewerExhibitionState_purgeAfter_idx" ON "ViewerExhibitionState"("purgeAfter");
CREATE INDEX "AccessGrant_deletedAt_idx" ON "AccessGrant"("deletedAt");
CREATE INDEX "AccessGrant_purgeAfter_idx" ON "AccessGrant"("purgeAfter");
CREATE INDEX "AdminAction_deletedAt_idx" ON "AdminAction"("deletedAt");
CREATE INDEX "AdminAction_purgeAfter_idx" ON "AdminAction"("purgeAfter");
CREATE INDEX "AuditLog_deletedAt_idx" ON "AuditLog"("deletedAt");
CREATE INDEX "AuditLog_purgeAfter_idx" ON "AuditLog"("purgeAfter");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "User_purgeAfter_idx" ON "User"("purgeAfter");
CREATE INDEX "Role_deletedAt_idx" ON "Role"("deletedAt");
CREATE INDEX "Role_purgeAfter_idx" ON "Role"("purgeAfter");
CREATE INDEX "UserRole_deletedAt_idx" ON "UserRole"("deletedAt");
CREATE INDEX "UserRole_purgeAfter_idx" ON "UserRole"("purgeAfter");
CREATE INDEX "Exhibit_deletedAt_idx" ON "Exhibit"("deletedAt");
CREATE INDEX "Exhibit_purgeAfter_idx" ON "Exhibit"("purgeAfter");
CREATE INDEX "ExhibitionDayContent_deletedAt_idx" ON "ExhibitionDayContent"("deletedAt");
CREATE INDEX "ExhibitionDayContent_purgeAfter_idx" ON "ExhibitionDayContent"("purgeAfter");
CREATE INDEX "ExhibitionDayAsset_deletedAt_idx" ON "ExhibitionDayAsset"("deletedAt");
CREATE INDEX "ExhibitionDayAsset_purgeAfter_idx" ON "ExhibitionDayAsset"("purgeAfter");
CREATE INDEX "AiGenerationJob_deletedAt_idx" ON "AiGenerationJob"("deletedAt");
CREATE INDEX "AiGenerationJob_purgeAfter_idx" ON "AiGenerationJob"("purgeAfter");
CREATE INDEX "MarketingOutboxEvent_deletedAt_idx" ON "MarketingOutboxEvent"("deletedAt");
CREATE INDEX "MarketingOutboxEvent_purgeAfter_idx" ON "MarketingOutboxEvent"("purgeAfter");

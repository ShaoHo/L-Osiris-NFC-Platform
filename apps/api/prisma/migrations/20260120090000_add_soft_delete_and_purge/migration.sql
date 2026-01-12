ALTER TABLE "NfcTag" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "purgeAfter" TIMESTAMP(3);
ALTER TABLE "Exhibition" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "purgeAfter" TIMESTAMP(3);
ALTER TABLE "ExhibitionVersion" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "purgeAfter" TIMESTAMP(3);
ALTER TABLE "ExhibitionRun" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "purgeAfter" TIMESTAMP(3);

CREATE INDEX "NfcTag_deletedAt_idx" ON "NfcTag"("deletedAt");
CREATE INDEX "NfcTag_purgeAfter_idx" ON "NfcTag"("purgeAfter");

CREATE INDEX "Exhibition_deletedAt_idx" ON "Exhibition"("deletedAt");
CREATE INDEX "Exhibition_purgeAfter_idx" ON "Exhibition"("purgeAfter");

CREATE INDEX "ExhibitionVersion_deletedAt_idx" ON "ExhibitionVersion"("deletedAt");
CREATE INDEX "ExhibitionVersion_purgeAfter_idx" ON "ExhibitionVersion"("purgeAfter");

CREATE INDEX "ExhibitionRun_deletedAt_idx" ON "ExhibitionRun"("deletedAt");
CREATE INDEX "ExhibitionRun_purgeAfter_idx" ON "ExhibitionRun"("purgeAfter");

ALTER TYPE "ExhibitionStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "AdminActionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CuratorTier') THEN
    CREATE TYPE "CuratorTier" AS ENUM ('STANDARD', 'CREATOR');
  END IF;
END $$;

ALTER TABLE "Curator"
ADD COLUMN "tier" "CuratorTier" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "payoutProfileCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "suspendedReason" TEXT;

ALTER TABLE "Exhibition"
ADD COLUMN "governanceMaskedAt" TIMESTAMP(3),
ADD COLUMN "governanceMaskReason" TEXT,
ADD COLUMN "monetizationEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Exhibition"
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "ViewerProfile"
ALTER COLUMN "nickname" DROP NOT NULL;

ALTER TABLE "ViewerSession"
ADD COLUMN "nfcTagId" TEXT;

ALTER TABLE "ViewerSession"
ADD CONSTRAINT "ViewerSession_nfcTagId_fkey" FOREIGN KEY ("nfcTagId") REFERENCES "NfcTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ViewerExhibitionState"
ADD COLUMN "viewerSessionId" TEXT;

ALTER TABLE "ViewerExhibitionState"
ALTER COLUMN "viewerId" DROP NOT NULL;

UPDATE "ViewerExhibitionState"
SET "viewerSessionId" = (
  SELECT "id" FROM "ViewerSession" LIMIT 1
)
WHERE "viewerSessionId" IS NULL;

ALTER TABLE "ViewerExhibitionState"
ALTER COLUMN "viewerSessionId" SET NOT NULL;

ALTER TABLE "ViewerExhibitionState"
DROP CONSTRAINT IF EXISTS "ViewerExhibitionState_viewerId_exhibitionId_key";

ALTER TABLE "ViewerExhibitionState"
ADD CONSTRAINT "ViewerExhibitionState_viewerSessionId_exhibitionId_key" UNIQUE ("viewerSessionId", "exhibitionId");

ALTER TABLE "ViewerExhibitionState"
ADD CONSTRAINT "ViewerExhibitionState_viewerSessionId_fkey" FOREIGN KEY ("viewerSessionId") REFERENCES "ViewerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ViewerSession_nfcTagId_idx" ON "ViewerSession"("nfcTagId");
CREATE INDEX IF NOT EXISTS "ViewerExhibitionState_viewerSessionId_idx" ON "ViewerExhibitionState"("viewerSessionId");

ALTER TABLE "AdminAction"
ADD COLUMN "confirmedBy" TEXT,
ADD COLUMN "executedBy" TEXT,
ADD COLUMN "cancelledBy" TEXT,
ADD COLUMN "confirmedAt" TIMESTAMP(3),
ADD COLUMN "executedAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "executeAfter" TIMESTAMP(3);

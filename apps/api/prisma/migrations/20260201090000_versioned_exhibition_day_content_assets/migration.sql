-- Add version linkage to ExhibitionDayContent
ALTER TABLE "ExhibitionDayContent" ADD COLUMN "versionId" TEXT;

UPDATE "ExhibitionDayContent" AS edc
SET "versionId" = (
    SELECT ev."id"
    FROM "ExhibitionVersion" AS ev
    WHERE ev."exhibitionId" = edc."exhibitionId"
    ORDER BY ev."createdAt" DESC
    LIMIT 1
)
WHERE edc."versionId" IS NULL;

ALTER TABLE "ExhibitionDayContent" ALTER COLUMN "versionId" SET NOT NULL;

-- Drop existing exhibitionId constraints/indexes
DROP INDEX "ExhibitionDayContent_exhibitionId_dayIndex_status_key";
DROP INDEX "ExhibitionDayContent_exhibitionId_idx";
DROP INDEX "ExhibitionDayContent_exhibitionId_dayIndex_idx";
ALTER TABLE "ExhibitionDayContent" DROP CONSTRAINT "ExhibitionDayContent_exhibitionId_fkey";
ALTER TABLE "ExhibitionDayContent" DROP COLUMN "exhibitionId";

-- Add version indexes/constraints
CREATE UNIQUE INDEX "ExhibitionDayContent_versionId_dayIndex_status_key" ON "ExhibitionDayContent"("versionId", "dayIndex", "status");
CREATE INDEX "ExhibitionDayContent_versionId_idx" ON "ExhibitionDayContent"("versionId");
CREATE INDEX "ExhibitionDayContent_versionId_dayIndex_idx" ON "ExhibitionDayContent"("versionId", "dayIndex");
ALTER TABLE "ExhibitionDayContent" ADD CONSTRAINT "ExhibitionDayContent_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ExhibitionVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create ExhibitionDayAsset
CREATE TABLE "ExhibitionDayAsset" (
    "id" TEXT NOT NULL,
    "dayContentId" TEXT NOT NULL,
    "assetUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "usageMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExhibitionDayAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExhibitionDayAsset_dayContentId_idx" ON "ExhibitionDayAsset"("dayContentId");

ALTER TABLE "ExhibitionDayAsset" ADD CONSTRAINT "ExhibitionDayAsset_dayContentId_fkey" FOREIGN KEY ("dayContentId") REFERENCES "ExhibitionDayContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

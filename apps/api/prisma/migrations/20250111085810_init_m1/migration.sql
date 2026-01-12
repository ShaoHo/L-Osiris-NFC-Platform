-- CreateEnum
CREATE TYPE "NfcTagStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ExhibitionType" AS ENUM ('ONE_TO_ONE', 'ONE_TO_MANY');

-- CreateEnum
CREATE TYPE "ExhibitionVisibility" AS ENUM ('DRAFT', 'PUBLIC');

-- CreateEnum
CREATE TYPE "ExhibitionStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ViewerExhibitionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ExhibitRenderMode" AS ENUM ('BLOCKS', 'HTML');

-- CreateTable
CREATE TABLE "NfcTag" (
    "id" TEXT NOT NULL,
    "publicTagId" TEXT NOT NULL,
    "status" "NfcTagStatus" NOT NULL DEFAULT 'ACTIVE',
    "boundExhibitionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NfcTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exhibition" (
    "id" TEXT NOT NULL,
    "type" "ExhibitionType" NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "visibility" "ExhibitionVisibility" NOT NULL DEFAULT 'DRAFT',
    "status" "ExhibitionStatus" NOT NULL DEFAULT 'ACTIVE',
    "curatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exhibition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewerProfile" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ViewerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewerSession" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ViewerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewerExhibitionState" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "exhibitionId" TEXT NOT NULL,
    "status" "ViewerExhibitionStatus" NOT NULL DEFAULT 'ACTIVE',
    "activatedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "lastDayIndex" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ViewerExhibitionState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exhibit" (
    "id" TEXT NOT NULL,
    "exhibitionId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "mode" "ExhibitRenderMode" NOT NULL,
    "blocksJson" JSONB,
    "html" TEXT,
    "css" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exhibit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NfcTag_publicTagId_key" ON "NfcTag"("publicTagId");

-- CreateIndex
CREATE INDEX "NfcTag_publicTagId_idx" ON "NfcTag"("publicTagId");

-- CreateIndex
CREATE INDEX "NfcTag_boundExhibitionId_idx" ON "NfcTag"("boundExhibitionId");

-- CreateIndex
CREATE INDEX "Exhibition_status_idx" ON "Exhibition"("status");

-- CreateIndex
CREATE INDEX "Exhibition_visibility_idx" ON "Exhibition"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "ViewerSession_tokenHash_key" ON "ViewerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "ViewerSession_viewerId_idx" ON "ViewerSession"("viewerId");

-- CreateIndex
CREATE INDEX "ViewerSession_tokenHash_idx" ON "ViewerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "ViewerSession_expiresAt_idx" ON "ViewerSession"("expiresAt");

-- CreateIndex
CREATE INDEX "ViewerExhibitionState_viewerId_idx" ON "ViewerExhibitionState"("viewerId");

-- CreateIndex
CREATE INDEX "ViewerExhibitionState_exhibitionId_idx" ON "ViewerExhibitionState"("exhibitionId");

-- CreateIndex
CREATE UNIQUE INDEX "ViewerExhibitionState_viewerId_exhibitionId_key" ON "ViewerExhibitionState"("viewerId", "exhibitionId");

-- CreateIndex
CREATE INDEX "Exhibit_exhibitionId_idx" ON "Exhibit"("exhibitionId");

-- CreateIndex
CREATE INDEX "Exhibit_exhibitionId_dayIndex_idx" ON "Exhibit"("exhibitionId", "dayIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Exhibit_exhibitionId_dayIndex_key" ON "Exhibit"("exhibitionId", "dayIndex");

-- AddForeignKey
ALTER TABLE "NfcTag" ADD CONSTRAINT "NfcTag_boundExhibitionId_fkey" FOREIGN KEY ("boundExhibitionId") REFERENCES "Exhibition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerSession" ADD CONSTRAINT "ViewerSession_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "ViewerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerExhibitionState" ADD CONSTRAINT "ViewerExhibitionState_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "ViewerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerExhibitionState" ADD CONSTRAINT "ViewerExhibitionState_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exhibit" ADD CONSTRAINT "Exhibit_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

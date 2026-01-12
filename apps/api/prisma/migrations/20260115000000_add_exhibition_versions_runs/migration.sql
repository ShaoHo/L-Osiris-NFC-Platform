-- CreateTable
CREATE TABLE "ExhibitionVersion" (
    "id" TEXT NOT NULL,
    "exhibitionId" TEXT NOT NULL,
    "type" "ExhibitionType" NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "visibility" "ExhibitionVisibility" NOT NULL,
    "status" "ExhibitionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExhibitionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExhibitionRun" (
    "id" TEXT NOT NULL,
    "viewerSessionId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "restartFromDay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExhibitionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExhibitionVersion_exhibitionId_idx" ON "ExhibitionVersion"("exhibitionId");

-- CreateIndex
CREATE INDEX "ExhibitionRun_viewerSessionId_idx" ON "ExhibitionRun"("viewerSessionId");

-- CreateIndex
CREATE INDEX "ExhibitionRun_versionId_idx" ON "ExhibitionRun"("versionId");

-- AddForeignKey
ALTER TABLE "ExhibitionVersion" ADD CONSTRAINT "ExhibitionVersion_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExhibitionRun" ADD CONSTRAINT "ExhibitionRun_viewerSessionId_fkey" FOREIGN KEY ("viewerSessionId") REFERENCES "ViewerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExhibitionRun" ADD CONSTRAINT "ExhibitionRun_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ExhibitionVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

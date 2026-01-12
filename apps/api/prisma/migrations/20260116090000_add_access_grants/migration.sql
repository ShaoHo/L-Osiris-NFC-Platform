-- CreateTable
CREATE TABLE "AccessGrant" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "exhibitionId" TEXT,
    "versionId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccessGrant_viewerId_idx" ON "AccessGrant"("viewerId");

-- CreateIndex
CREATE INDEX "AccessGrant_exhibitionId_idx" ON "AccessGrant"("exhibitionId");

-- CreateIndex
CREATE INDEX "AccessGrant_versionId_idx" ON "AccessGrant"("versionId");

-- CreateIndex
CREATE INDEX "AccessGrant_expiresAt_idx" ON "AccessGrant"("expiresAt");

-- CreateIndex
CREATE INDEX "AccessGrant_revokedAt_idx" ON "AccessGrant"("revokedAt");

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "ViewerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ExhibitionVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

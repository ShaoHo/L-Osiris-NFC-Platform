-- CreateEnum
CREATE TYPE "NfcScopePolicy" AS ENUM ('EXHIBITION_ONLY', 'EXHIBITION_AND_GALLERY');

-- CreateTable
CREATE TABLE "Curator" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Curator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuratorPolicy" (
    "id" TEXT NOT NULL,
    "curatorId" TEXT NOT NULL,
    "nfcScopePolicy" "NfcScopePolicy" NOT NULL DEFAULT 'EXHIBITION_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuratorPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuratorPolicy_curatorId_key" ON "CuratorPolicy"("curatorId");

-- CreateIndex
CREATE INDEX "CuratorPolicy_curatorId_idx" ON "CuratorPolicy"("curatorId");

-- AddColumn
ALTER TABLE "NfcTag" ADD COLUMN "curatorId" TEXT;

-- CreateIndex
CREATE INDEX "Exhibition_curatorId_idx" ON "Exhibition"("curatorId");

-- CreateIndex
CREATE INDEX "NfcTag_curatorId_idx" ON "NfcTag"("curatorId");

-- AddForeignKey
ALTER TABLE "CuratorPolicy" ADD CONSTRAINT "CuratorPolicy_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "Curator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exhibition" ADD CONSTRAINT "Exhibition_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "Curator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NfcTag" ADD CONSTRAINT "NfcTag_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "Curator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

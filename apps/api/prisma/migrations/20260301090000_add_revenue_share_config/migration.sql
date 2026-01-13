CREATE TABLE "RevenueShareConfig" (
  "id" TEXT NOT NULL,
  "curatorId" TEXT NOT NULL,
  "curatorShareBps" INTEGER NOT NULL,
  "platformShareBps" INTEGER NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "purgeAfter" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RevenueShareConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RevenueShareConfig_curatorId_key" ON "RevenueShareConfig"("curatorId");
CREATE INDEX "RevenueShareConfig_curatorId_idx" ON "RevenueShareConfig"("curatorId");
CREATE INDEX "RevenueShareConfig_deletedAt_idx" ON "RevenueShareConfig"("deletedAt");
CREATE INDEX "RevenueShareConfig_purgeAfter_idx" ON "RevenueShareConfig"("purgeAfter");

ALTER TABLE "RevenueShareConfig"
ADD CONSTRAINT "RevenueShareConfig_curatorId_fkey"
FOREIGN KEY ("curatorId") REFERENCES "Curator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

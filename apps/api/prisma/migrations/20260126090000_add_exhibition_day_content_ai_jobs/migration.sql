-- CreateEnum
CREATE TYPE "ExhibitionDayContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "AiGenerationJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ExhibitionDayContent" (
    "id" TEXT NOT NULL,
    "exhibitionId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "status" "ExhibitionDayContentStatus" NOT NULL DEFAULT 'DRAFT',
    "html" TEXT,
    "css" TEXT,
    "assetRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExhibitionDayContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGenerationJob" (
    "id" TEXT NOT NULL,
    "exhibitionId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "assetMetadata" JSONB,
    "status" "AiGenerationJobStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExhibitionDayContent_exhibitionId_dayIndex_status_key" ON "ExhibitionDayContent"("exhibitionId", "dayIndex", "status");

-- CreateIndex
CREATE INDEX "ExhibitionDayContent_exhibitionId_idx" ON "ExhibitionDayContent"("exhibitionId");

-- CreateIndex
CREATE INDEX "ExhibitionDayContent_exhibitionId_dayIndex_idx" ON "ExhibitionDayContent"("exhibitionId", "dayIndex");

-- CreateIndex
CREATE INDEX "ExhibitionDayContent_status_idx" ON "ExhibitionDayContent"("status");

-- CreateIndex
CREATE INDEX "AiGenerationJob_exhibitionId_idx" ON "AiGenerationJob"("exhibitionId");

-- CreateIndex
CREATE INDEX "AiGenerationJob_exhibitionId_dayIndex_idx" ON "AiGenerationJob"("exhibitionId", "dayIndex");

-- CreateIndex
CREATE INDEX "AiGenerationJob_status_idx" ON "AiGenerationJob"("status");

-- AddForeignKey
ALTER TABLE "ExhibitionDayContent" ADD CONSTRAINT "ExhibitionDayContent_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationJob" ADD CONSTRAINT "AiGenerationJob_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

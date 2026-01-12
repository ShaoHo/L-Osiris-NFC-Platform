-- CreateEnum
CREATE TYPE "MarketingOutboxEventType" AS ENUM ('CONTACT_SYNC');

-- CreateEnum
CREATE TYPE "MarketingOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MarketingContactType" AS ENUM ('VIEWER', 'CURATOR');

-- CreateTable
CREATE TABLE "MarketingOutboxEvent" (
    "id" TEXT NOT NULL,
    "eventType" "MarketingOutboxEventType" NOT NULL,
    "contactType" "MarketingContactType" NOT NULL,
    "contactId" TEXT NOT NULL,
    "payload" JSONB,
    "status" "MarketingOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingOutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingOutboxEvent_status_idx" ON "MarketingOutboxEvent"("status");

-- CreateIndex
CREATE INDEX "MarketingOutboxEvent_eventType_idx" ON "MarketingOutboxEvent"("eventType");

-- CreateIndex
CREATE INDEX "MarketingOutboxEvent_contactType_contactId_idx" ON "MarketingOutboxEvent"("contactType", "contactId");

CREATE TABLE "AdminAction" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedBy" TEXT NOT NULL,
  "confirmedBy" TEXT,
  "executedBy" TEXT,
  "cancelledBy" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "executeAfter" TIMESTAMP(3),
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

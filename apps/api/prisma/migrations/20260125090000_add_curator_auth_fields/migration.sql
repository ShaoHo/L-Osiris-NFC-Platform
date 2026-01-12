ALTER TABLE "Curator"
ADD COLUMN "email" TEXT NOT NULL,
ADD COLUMN "passwordHash" TEXT NOT NULL,
ADD COLUMN "passwordUpdatedAt" TIMESTAMP(3),
ADD COLUMN "resetTokenHash" TEXT,
ADD COLUMN "resetTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Curator_email_key" ON "Curator"("email");
CREATE INDEX "Curator_email_idx" ON "Curator"("email");
CREATE INDEX "Curator_resetTokenExpiresAt_idx" ON "Curator"("resetTokenExpiresAt");

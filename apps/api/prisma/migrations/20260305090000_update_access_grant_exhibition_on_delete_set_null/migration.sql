ALTER TABLE "AccessGrant" DROP CONSTRAINT "AccessGrant_exhibitionId_fkey";

ALTER TABLE "AccessGrant"
ADD CONSTRAINT "AccessGrant_exhibitionId_fkey"
FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

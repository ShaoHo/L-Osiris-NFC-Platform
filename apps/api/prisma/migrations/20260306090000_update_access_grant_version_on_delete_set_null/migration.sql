ALTER TABLE "AccessGrant" DROP CONSTRAINT "AccessGrant_versionId_fkey";

ALTER TABLE "AccessGrant"
ADD CONSTRAINT "AccessGrant_versionId_fkey"
FOREIGN KEY ("versionId") REFERENCES "ExhibitionVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

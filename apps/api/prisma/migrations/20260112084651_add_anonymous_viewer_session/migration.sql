-- AlterTable
ALTER TABLE "ViewerSession" ALTER COLUMN "viewerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ViewerSession" ADD COLUMN     "displayName" TEXT;

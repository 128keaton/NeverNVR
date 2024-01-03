-- AlterTable
ALTER TABLE "Clip" ADD COLUMN     "analyticsJobID" TEXT,
ADD COLUMN     "analyzed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "analyzedFileName" TEXT,
ADD COLUMN     "primaryTag" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Snapshot" ADD COLUMN     "analyticsJobID" TEXT,
ADD COLUMN     "analyzed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "analyzedFileName" TEXT,
ADD COLUMN     "primaryTag" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

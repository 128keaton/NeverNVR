-- AlterTable
ALTER TABLE "Clip" ADD COLUMN     "analyzing" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Snapshot" ADD COLUMN     "analyzing" BOOLEAN NOT NULL DEFAULT false;

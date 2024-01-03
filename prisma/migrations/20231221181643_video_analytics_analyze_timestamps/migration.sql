-- AlterTable
ALTER TABLE "Clip" ADD COLUMN     "analyzeEnd" TIMESTAMP(3),
ADD COLUMN     "analyzeStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Snapshot" ADD COLUMN     "analyzeEnd" TIMESTAMP(3),
ADD COLUMN     "analyzeStart" TIMESTAMP(3);

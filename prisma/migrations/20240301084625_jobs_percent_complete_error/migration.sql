-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "percentComplete" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

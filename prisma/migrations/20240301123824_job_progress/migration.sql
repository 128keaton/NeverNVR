/*
  Warnings:

  - You are about to drop the column `percentComplete` on the `Job` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Job" DROP COLUMN "percentComplete",
ADD COLUMN     "generationProgress" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "uploadProgress" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

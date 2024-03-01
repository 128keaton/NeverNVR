/*
  Warnings:

  - You are about to drop the column `generateEnd` on the `Clip` table. All the data in the column will be lost.
  - You are about to drop the column `generateStart` on the `Clip` table. All the data in the column will be lost.
  - You are about to drop the column `generated` on the `Clip` table. All the data in the column will be lost.
  - You are about to drop the column `generationJobID` on the `Clip` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[generatedClipID]` on the table `Job` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Clip" DROP COLUMN "generateEnd",
DROP COLUMN "generateStart",
DROP COLUMN "generated",
DROP COLUMN "generationJobID";

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "generatedClipID" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Job_generatedClipID_key" ON "Job"("generatedClipID");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_generatedClipID_fkey" FOREIGN KEY ("generatedClipID") REFERENCES "Clip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

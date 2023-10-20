/*
  Warnings:

  - You are about to drop the column `recordingPID` on the `Clip` table. All the data in the column will be lost.
  - You are about to drop the column `streamingPID` on the `Clip` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Camera" ADD COLUMN     "recordingPID" INTEGER,
ADD COLUMN     "streamingPID" INTEGER;

-- AlterTable
ALTER TABLE "Clip" DROP COLUMN "recordingPID",
DROP COLUMN "streamingPID";

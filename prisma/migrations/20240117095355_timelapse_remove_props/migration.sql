/*
  Warnings:

  - You are about to drop the column `duration` on the `Timelapse` table. All the data in the column will be lost.
  - You are about to drop the column `fileSize` on the `Timelapse` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `Timelapse` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `Timelapse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Timelapse" DROP COLUMN "duration",
DROP COLUMN "fileSize",
DROP COLUMN "height",
DROP COLUMN "width";

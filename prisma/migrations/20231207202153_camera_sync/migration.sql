/*
  Warnings:

  - You are about to drop the column `connectionURL` on the `Gateway` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Camera" ADD COLUMN     "synchronized" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Gateway" DROP COLUMN "connectionURL";

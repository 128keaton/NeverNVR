/*
  Warnings:

  - A unique constraint covering the columns `[s3Bucket]` on the table `Gateway` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `s3Bucket` to the `Gateway` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Gateway" ADD COLUMN     "s3Bucket" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Gateway_s3Bucket_key" ON "Gateway"("s3Bucket");

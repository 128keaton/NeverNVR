/*
  Warnings:

  - Added the required column `connectionURL` to the `Gateway` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Gateway" ADD COLUMN     "connectionURL" TEXT NOT NULL;

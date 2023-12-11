/*
  Warnings:

  - You are about to drop the column `deleteAfter` on the `Clip` table. All the data in the column will be lost.
  - You are about to drop the column `deleteAfter` on the `Snapshot` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Clip" DROP COLUMN "deleteAfter",
ADD COLUMN     "availableCloud" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "availableLocally" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Snapshot" DROP COLUMN "deleteAfter",
ADD COLUMN     "availableCloud" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "availableLocally" BOOLEAN NOT NULL DEFAULT true;

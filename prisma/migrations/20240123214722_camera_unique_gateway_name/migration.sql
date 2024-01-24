/*
  Warnings:

  - A unique constraint covering the columns `[name,gatewayID]` on the table `Camera` will be added. If there are existing duplicate values, this will fail.
  - Made the column `gatewayID` on table `Camera` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Camera" DROP CONSTRAINT "Camera_gatewayID_fkey";

-- AlterTable
ALTER TABLE "Camera" ALTER COLUMN "gatewayID" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Camera_name_gatewayID_key" ON "Camera"("name", "gatewayID");

-- AddForeignKey
ALTER TABLE "Camera" ADD CONSTRAINT "Camera_gatewayID_fkey" FOREIGN KEY ("gatewayID") REFERENCES "Gateway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

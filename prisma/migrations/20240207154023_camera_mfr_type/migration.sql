-- CreateEnum
CREATE TYPE "CameraType" AS ENUM ('bullet', 'dome', 'thermal', 'standard', 'ptz', 'ptz_thermal');

-- AlterTable
ALTER TABLE "Camera" ADD COLUMN     "manufacturer" TEXT NOT NULL DEFAULT 'Hikvision',
ADD COLUMN     "type" "CameraType" NOT NULL DEFAULT 'standard';

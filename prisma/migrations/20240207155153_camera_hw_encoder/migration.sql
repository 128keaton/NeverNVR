-- CreateEnum
CREATE TYPE "HardwareEncoderPriority" AS ENUM ('vaapi', 'u30', 'nvidia', 'none');

-- AlterTable
ALTER TABLE "Camera" ADD COLUMN     "hardwareEncoderPriority" "HardwareEncoderPriority" NOT NULL DEFAULT 'none';

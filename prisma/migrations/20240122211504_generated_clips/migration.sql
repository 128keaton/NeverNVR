-- CreateEnum
CREATE TYPE "ClipType" AS ENUM ('recording', 'generated');

-- AlterTable
ALTER TABLE "Clip" ADD COLUMN     "generateEnd" TIMESTAMP(3),
ADD COLUMN     "generateStart" TIMESTAMP(3),
ADD COLUMN     "generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "generationJobID" TEXT,
ADD COLUMN     "type" "ClipType" NOT NULL DEFAULT 'recording';

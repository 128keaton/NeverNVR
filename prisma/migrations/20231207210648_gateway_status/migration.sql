-- AlterTable
ALTER TABLE "Gateway" ADD COLUMN     "lastConnection" TIMESTAMP(3),
ADD COLUMN     "status" "ConnectionStatus" NOT NULL DEFAULT 'UNKNOWN';

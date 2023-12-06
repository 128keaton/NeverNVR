-- CreateEnum
CREATE TYPE "ClipFormat" AS ENUM ('h265', 'h264');

-- CreateEnum
CREATE TYPE "UploadTaskType" AS ENUM ('clip', 'snapshot');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Gateway" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "connectionURL" TEXT NOT NULL,

    CONSTRAINT "Gateway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Camera" (
    "id" UUID NOT NULL,
    "stream" BOOLEAN NOT NULL DEFAULT true,
    "record" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "deleteClipAfter" INTEGER NOT NULL DEFAULT 72,
    "deleteSnapshotAfter" INTEGER NOT NULL DEFAULT 72,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "gatewayID" UUID,

    CONSTRAINT "Camera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleteAfter" INTEGER NOT NULL DEFAULT 72,
    "cameraID" UUID,
    "gatewayID" UUID,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clip" (
    "id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "format" "ClipFormat" NOT NULL DEFAULT 'h265',
    "start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end" TIMESTAMP(3),
    "deleteAfter" INTEGER NOT NULL DEFAULT 72,
    "cameraID" UUID,
    "gatewayID" UUID,

    CONSTRAINT "Clip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gateway_name_key" ON "Gateway"("name");

-- AddForeignKey
ALTER TABLE "Camera" ADD CONSTRAINT "Camera_gatewayID_fkey" FOREIGN KEY ("gatewayID") REFERENCES "Gateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_cameraID_fkey" FOREIGN KEY ("cameraID") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_gatewayID_fkey" FOREIGN KEY ("gatewayID") REFERENCES "Gateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_cameraID_fkey" FOREIGN KEY ("cameraID") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_gatewayID_fkey" FOREIGN KEY ("gatewayID") REFERENCES "Gateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;

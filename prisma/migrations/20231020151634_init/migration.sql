-- CreateEnum
CREATE TYPE "CameraMode" AS ENUM ('RECORD', 'VIEW');

-- CreateEnum
CREATE TYPE "ClipFormat" AS ENUM ('H265', 'H264');

-- CreateTable
CREATE TABLE "Camera" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "host" TEXT NOT NULL,
    "streamURL" TEXT,
    "snapshotURL" TEXT,
    "username" TEXT,
    "password" TEXT,
    "recording" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "mode" "CameraMode" NOT NULL DEFAULT 'RECORD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "deleteClipAfter" INTEGER NOT NULL DEFAULT 72,
    "deleteSnapshotAfter" INTEGER NOT NULL DEFAULT 72,
    "onvifURL" TEXT,
    "onvifUsername" TEXT,
    "onvifPassword" TEXT,

    CONSTRAINT "Camera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" UUID NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "fileName" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleteAfter" INTEGER NOT NULL DEFAULT 72,
    "cameraID" UUID,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clip" (
    "id" UUID NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "fileName" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "format" "ClipFormat" NOT NULL DEFAULT 'H265',
    "start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end" TIMESTAMP(3),
    "deleteAfter" INTEGER NOT NULL DEFAULT 72,
    "cameraID" UUID,

    CONSTRAINT "Clip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Camera_name_key" ON "Camera"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Camera_host_key" ON "Camera"("host");

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_cameraID_fkey" FOREIGN KEY ("cameraID") REFERENCES "Camera"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_cameraID_fkey" FOREIGN KEY ("cameraID") REFERENCES "Camera"("id") ON DELETE SET NULL ON UPDATE CASCADE;

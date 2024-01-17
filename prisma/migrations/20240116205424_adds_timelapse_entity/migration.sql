-- CreateTable
CREATE TABLE "Timelapse" (
    "id" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "days" INTEGER NOT NULL DEFAULT 0,
    "format" "ClipFormat" NOT NULL DEFAULT 'h265',
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "cameraID" UUID,
    "gatewayID" UUID,
    "timelapseJobID" TEXT NOT NULL,
    "generating" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Timelapse_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Timelapse" ADD CONSTRAINT "Timelapse_cameraID_fkey" FOREIGN KEY ("cameraID") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timelapse" ADD CONSTRAINT "Timelapse_gatewayID_fkey" FOREIGN KEY ("gatewayID") REFERENCES "Gateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;

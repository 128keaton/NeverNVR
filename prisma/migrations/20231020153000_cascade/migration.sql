-- DropForeignKey
ALTER TABLE "Clip" DROP CONSTRAINT "Clip_cameraID_fkey";

-- DropForeignKey
ALTER TABLE "Snapshot" DROP CONSTRAINT "Snapshot_cameraID_fkey";

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_cameraID_fkey" FOREIGN KEY ("cameraID") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_cameraID_fkey" FOREIGN KEY ("cameraID") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

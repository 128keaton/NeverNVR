/*
  Warnings:

  - Added the required column `hash` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ClipJobs" DROP CONSTRAINT "ClipJobs_clipID_fkey";

-- DropForeignKey
ALTER TABLE "ClipJobs" DROP CONSTRAINT "ClipJobs_jobID_fkey";

-- DropForeignKey
ALTER TABLE "SnapshotJobs" DROP CONSTRAINT "SnapshotJobs_jobID_fkey";

-- DropForeignKey
ALTER TABLE "SnapshotJobs" DROP CONSTRAINT "SnapshotJobs_snapshotID_fkey";

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "hash" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ClipJobs" ADD CONSTRAINT "ClipJobs_jobID_fkey" FOREIGN KEY ("jobID") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClipJobs" ADD CONSTRAINT "ClipJobs_clipID_fkey" FOREIGN KEY ("clipID") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnapshotJobs" ADD CONSTRAINT "SnapshotJobs_jobID_fkey" FOREIGN KEY ("jobID") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnapshotJobs" ADD CONSTRAINT "SnapshotJobs_snapshotID_fkey" FOREIGN KEY ("snapshotID") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

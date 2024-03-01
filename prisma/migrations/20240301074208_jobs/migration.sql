-- CreateEnum
CREATE TYPE "JobState" AS ENUM ('INITIALIZING', 'REQUESTING', 'UPLOADING', 'PROCESSING', 'ERROR', 'COMPLETE');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('CONCAT', 'ANALYZE', 'TIMELAPSE');

-- CreateTable
CREATE TABLE "ClipJobs" (
    "id" UUID NOT NULL,
    "jobID" UUID NOT NULL,
    "clipID" TEXT NOT NULL,

    CONSTRAINT "ClipJobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnapshotJobs" (
    "id" UUID NOT NULL,
    "jobID" UUID NOT NULL,
    "snapshotID" TEXT NOT NULL,

    CONSTRAINT "SnapshotJobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "fileName" TEXT,
    "state" "JobState" NOT NULL DEFAULT 'INITIALIZING',
    "type" "JobType" NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClipJobs" ADD CONSTRAINT "ClipJobs_jobID_fkey" FOREIGN KEY ("jobID") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClipJobs" ADD CONSTRAINT "ClipJobs_clipID_fkey" FOREIGN KEY ("clipID") REFERENCES "Clip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnapshotJobs" ADD CONSTRAINT "SnapshotJobs_jobID_fkey" FOREIGN KEY ("jobID") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnapshotJobs" ADD CONSTRAINT "SnapshotJobs_snapshotID_fkey" FOREIGN KEY ("snapshotID") REFERENCES "Snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

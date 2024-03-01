-- CreateIndex
CREATE INDEX "ClipJobs_clipID_jobID_idx" ON "ClipJobs"("clipID", "jobID");

-- CreateIndex
CREATE INDEX "Job_id_hash_serviceID_idx" ON "Job"("id", "hash", "serviceID");

-- CreateIndex
CREATE INDEX "Job_id_hash_idx" ON "Job"("id", "hash");

-- CreateIndex
CREATE INDEX "SnapshotJobs_snapshotID_jobID_idx" ON "SnapshotJobs"("snapshotID", "jobID");

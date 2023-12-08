import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { SnapshotEvent } from './types';
import { SnapshotsGateway } from './snapshots.gateway';

@Processor('snapshots')
export class SnapshotsQueue {
  constructor(private snapshotsGateway: SnapshotsGateway) {}

  @Process('outgoing')
  processCamera(job: Job<SnapshotEvent>) {
    return this.snapshotsGateway.handleSnapshotEvent(job.data);
  }
}

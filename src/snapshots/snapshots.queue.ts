import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { SnapshotAnalyzed, SnapshotEvent } from './types';
import { SnapshotsGateway } from './snapshots.gateway';
import { SnapshotsService } from './snapshots.service';

@Processor('snapshots')
export class SnapshotsQueue {
  constructor(
    private snapshotsGateway: SnapshotsGateway,
    private snapshotsService: SnapshotsService,
  ) {}

  @Process('outgoing')
  processCamera(job: Job<SnapshotEvent>) {
    return this.snapshotsGateway.handleSnapshotEvent(job.data);
  }

  @Process('finished-analyze')
  async finishAnalyzingSnapshot(job: Job<SnapshotAnalyzed>) {
    const snapshot = await this.snapshotsService.getByAnalyticsJobID(
      job.data.analyticsJobID,
    );

    if (!snapshot) return;

    if (job.data.tags.length > 0) {
      return this.snapshotsService.update(snapshot.id, {
        analyzed: job.data.analyzed,
        analyzedFileName: job.data.analyzedFileName,
        tags: job.data.tags,
        primaryTag: job.data.primaryTag,
        analyzeEnd: new Date(),
        analyzing: false,
      });
    }

    return this.snapshotsService.update(snapshot.id, {
      analyzed: job.data.analyzed,
      analyzeEnd: new Date(),
      analyzing: false,
    });
  }

  @Process('started-analyze')
  async startAnalyzingSnapshot(job: Job<string>) {
    const snapshot = await this.snapshotsService.getByAnalyticsJobID(job.data);
    if (!snapshot) return;

    return this.snapshotsService.update(snapshot.id, {
      analyzing: true,
      analyzeStart: new Date(),
    });
  }
}

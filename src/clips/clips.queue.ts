import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ClipsGateway } from './clips.gateway';
import { ClipAnalyzed, ClipEvent } from './type';
import { ClipsService } from './clips.service';

@Processor('clips')
export class ClipsQueue {
  constructor(
    private clipsGateway: ClipsGateway,
    private clipsService: ClipsService,
  ) {}

  @Process('outgoing')
  processCamera(job: Job<ClipEvent>) {
    return this.clipsGateway.handleClipEvent(job.data);
  }

  @Process('finished-analyze')
  async finishAnalyzingClip(job: Job<ClipAnalyzed>) {
    const clip = await this.clipsService.getByAnalyticsJobID(
      job.data.analyticsJobID,
    );

    if (!clip) return;

    if (job.data.tags.length > 0) {
      return this.clipsService.update(clip.id, {
        analyzed: job.data.analyzed,
        analyzedFileName: job.data.analyzedFileName,
        tags: job.data.tags,
        primaryTag: job.data.primaryTag,
        analyzing: false,
        analyzeEnd: new Date(),
      });
    }

    return this.clipsService.update(clip.id, {
      analyzed: job.data.analyzed,
      analyzing: false,
      analyzeEnd: new Date(),
    });
  }

  @Process('started-analyze')
  async startAnalyzingClip(job: Job<string>) {
    const clip = await this.clipsService.getByAnalyticsJobID(job.data);
    if (!clip) return;

    return this.clipsService.update(clip.id, {
      analyzing: true,
      analyzeStart: new Date(),
    });
  }
}

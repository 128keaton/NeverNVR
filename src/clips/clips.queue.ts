import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ClipsGateway } from './clips.gateway';
import { ClipAnalyzed, ClipEvent } from './type';
import { ClipsService } from './clips.service';
import { GatewayEventsService } from '../gateway-events/gateway-events.service';

@Processor('clips')
export class ClipsQueue {
  constructor(
    private clipsGateway: ClipsGateway,
    private clipsService: ClipsService,
    private gatewayEventsService: GatewayEventsService,
  ) {}

  @Process('outgoing')
  async processCamera(job: Job<ClipEvent>) {
    await this.gatewayEventsService.handleClip(
      job.data.eventType,
      job.data.clip.id,
      { clip: job.data.clip },
    );

    return this.clipsGateway.handleClipEvent(job.data);
  }

  @Process('finished-analyze')
  async finishAnalyzingClip(job: Job<ClipAnalyzed>) {
    const clip = await this.clipsService.getByAnalyticsJobID(
      job.data.analyticsJobID,
    );

    if (!clip) return;

    if (job.data.tags.length > 0) {
      return this.clipsService.update(
        clip.id,
        {
          analyzed: job.data.analyzed,
          analyzedFileName: job.data.analyzedFileName,
          tags: job.data.tags,
          primaryTag: job.data.primaryTag,
          analyzing: false,
          analyzeEnd: new Date(),
        },
        clip.cameraID,
        clip.gatewayID,
      );
    }

    return this.clipsService.update(
      clip.id,
      {
        analyzed: job.data.analyzed,
        analyzing: false,
        analyzeEnd: new Date(),
      },
      clip.cameraID,
      clip.gatewayID,
    );
  }

  @Process('finished-generating')
  async finishGeneratingClip(
    job: Job<{ outputFilename: string; jobID: string }>,
  ) {
    const clip = await this.clipsService.getByGenerationJobID(job.data.jobID);

    if (!clip) return;

    return this.clipsService.update(
      clip.id,
      {
        generated: true,
        generateEnd: new Date(),
        fileName: job.data.outputFilename,
        availableCloud: true,
      },
      clip.cameraID,
      clip.gatewayID,
    );
  }

  @Process('started-analyze')
  async startAnalyzingClip(job: Job<string>) {
    const clip = await this.clipsService.getByAnalyticsJobID(job.data);
    if (!clip) return;

    return this.clipsService.update(
      clip.id,
      {
        analyzing: true,
        analyzeStart: new Date(),
      },
      clip.cameraID,
      clip.gatewayID,
    );
  }
}

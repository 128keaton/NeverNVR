import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { TimelapseService } from './timelapse.service';
import { TimelapseEvent } from './types/timelapse.event';
import { TimelapseGateway } from './timelapse.gateway';

@Processor('timelapse')
export class TimelapseQueue {
  constructor(
    private timelapseService: TimelapseService,
    private timelapseGateway: TimelapseGateway,
  ) {}

  @Process('finished')
  async timelapseFinished(job: Job<{ jobID: string; outputFilename: string }>) {
    const timelapse = await this.timelapseService.getByJobID(job.data.jobID);

    if (!timelapse) return;

    return this.timelapseService.update(timelapse.id, {
      generating: false,
      fileName: job.data.outputFilename,
    });
  }

  @Process('outgoing')
  async processTimelapse(job: Job<TimelapseEvent>) {
    return this.timelapseGateway.handleTimelapseEvent(job.data);
  }
}

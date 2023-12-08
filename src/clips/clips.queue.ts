import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ClipsGateway } from './clips.gateway';
import { ClipEvent } from './type';

@Processor('clips')
export class ClipsQueue {
  constructor(private clipsGateway: ClipsGateway) {}

  @Process('outgoing')
  processCamera(job: Job<ClipEvent>) {
    return this.clipsGateway.handleClipEvent(job.data);
  }
}

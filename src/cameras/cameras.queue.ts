import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { CameraEvent } from './types';
import { CamerasGateway } from './cameras.gateway';

@Processor('cameras')
export class CamerasQueue {
  constructor(
    private camerasGateway: CamerasGateway,
  ) {}

  @Process('outgoing')
  async processCamera(job: Job<CameraEvent>) {
    return this.camerasGateway.handleCameraEvent(job.data);
  }
}

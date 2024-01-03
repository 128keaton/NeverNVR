import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { CameraEvent } from './types';
import { GatewayEventsService } from '../gateway-events/gateway-events.service';
import { CamerasGateway } from './cameras.gateway';

@Processor('cameras')
export class CamerasQueue {
  constructor(
    private gatewayEventsService: GatewayEventsService,
    private camerasGateway: CamerasGateway,
  ) {}

  @Process('outgoing')
  async processCamera(job: Job<CameraEvent>) {
    const camera = {
      ...job.data.camera,
      ...job.data.update,
      ...job.data.create,
    };

    await this.gatewayEventsService.handleCamera(
      job.data.eventType,
      job.data.camera.id,
      camera,
    );

    return this.camerasGateway.handleCameraEvent(job.data);
  }
}

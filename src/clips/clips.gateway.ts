import { WebSocketGateway } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { GatewaysService } from '../gateways/gateways.service';
import { CommonGateway } from '../common/common-gateway';
import { ClipsService } from './services';
import { ClipEvent, ClipJobEvent } from './type';
import { Payload, Subscribe } from '@vipstorage/nest-mqtt';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  path: '/clips.io/',
})
export class ClipsGateway extends CommonGateway {
  override logger = new Logger(ClipsGateway.name);

  constructor(
    override gatewaysService: GatewaysService,
    private clipsService: ClipsService,
  ) {
    super(gatewaysService);

    this.clipsService.clipEvents.subscribe((event) => {
      this.handleClipEvent(event);
    });
  }

  handleClipEvent(event: ClipEvent) {
    // Get all UI clients (i.e. non gateway clients)
    const webClients = this.getWebClients();

    // Send the UI clients the same update
    webClients.forEach((client) => {
      client.emit(event.eventType, {
        id: event.clip.id,
        clip: event.clip,
        cameraID: event.cameraID,
      });
    });
  }

  handleClipJobEvent(event: ClipJobEvent) {
    // Get all UI clients (i.e. non gateway clients)
    const webClients = this.getWebClients();

    // Send the UI clients the same update
    webClients.forEach((client) => {
      client.emit(event.eventType, {
        id: event.job.id,
        job: event.job,
      });
    });
  }

  @Subscribe('never_gateway/clip/+/created')
  handleCreated(
    @Payload()
    payload: {
      id: string;
      clip: any;
      gatewayID?: string;
      cameraID?: string;
    },
  ) {
    if (!payload.gatewayID) return;

    return this.clipsService
      .create(
        {
          ...payload.clip,
          id: payload.id,
          gatewayID: payload.gatewayID,
        },
        payload.cameraID,
        false,
      )
      .catch((err) => {
        this.logger.error('Could not create clip:');
        this.logger.error(err);
        return null;
      });
  }

  @Subscribe('never_gateway/clip/+/updated')
  handleUpdated(
    @Payload()
    payload: {
      id: string;
      clip: any;
      gatewayID?: string;
      cameraID?: string;
    },
  ) {
    return this.clipsService.update(
      payload.id,
      payload.clip,
      payload.cameraID,
      payload.gatewayID,
      false,
    );
  }

  @Subscribe('never_gateway/clip/+/deleted')
  handleDeleted(
    @Payload()
    payload: {
      id: string;
      clip: any;
      gatewayID?: string;
      cameraID?: string;
    },
  ) {
    return this.clipsService.delete(payload.id, false);
  }
}

import { WebSocketGateway } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { GatewaysService } from '../gateways/gateways.service';
import { CommonGateway } from '../common/common-gateway';
import { ClipsService } from './clips.service';
import { ClipEvent } from './type';
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
    this.logger.verbose('Clips gateway active');

    this.clipsService.clipEvents.subscribe((event) => {
      this.handleClipEvent(event);
    });
  }

  handleClipEvent(event: ClipEvent) {
    const clip = {
      ...event.clip,
    };

    // Get all UI clients (i.e. non gateway clients)
    const webClients = this.getWebClients();

    // Send the UI clients the same update
    webClients.forEach((client) => {
      client.emit(event.eventType, {
        id: event.clip.id,
        clip,
        cameraID: event.cameraID,
      });
    });
  }

  @Subscribe('never/clip/+/created')
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

    this.logger.verbose(`Creating new clip from ${payload.gatewayID}`);
    return this.clipsService.create(
      {
        ...payload.clip,
        id: payload.id,
        gatewayID: payload.gatewayID,
      },
      payload.cameraID,
      false,
    );
  }

  @Subscribe('never/clip/+/updated')
  handleUpdated(
    @Payload()
    payload: {
      id: string;
      clip: any;
      gatewayID?: string;
      cameraID?: string;
    },
  ) {
    return this.clipsService.update(payload.id, payload.clip);
  }

  @Subscribe('never/clip/+/deleted')
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

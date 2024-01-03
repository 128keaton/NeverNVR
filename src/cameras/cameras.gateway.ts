import { WebSocketGateway } from '@nestjs/websockets';
import { Camera, CameraEvent, CameraUpdate } from './types';
import { Logger } from '@nestjs/common';
import { GatewaysService } from '../gateways/gateways.service';
import { CamerasService } from './cameras.service';
import { CommonGateway } from '../common/common-gateway';
import { Payload, Subscribe } from '@vipstorage/nest-mqtt';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  path: '/cameras.io/',
})
export class CamerasGateway extends CommonGateway {
  override logger = new Logger(CamerasGateway.name);

  constructor(
    override gatewaysService: GatewaysService,
    private camerasService: CamerasService,
  ) {
    super(gatewaysService);
    this.logger.verbose('Cameras gateway active');
    this.camerasService.cameraEvents.subscribe((event) => {
      return this.handleCameraEvent(event);
    });
  }

  async handleCameraEvent(event: CameraEvent) {
    const camera = {
      ...event.camera,
      ...event.update,
      ...event.create,
    };

    // Get all UI clients (i.e. non gateway clients)
    const webClients = this.getWebClients();

    // Send the UI clients the same update
    webClients.forEach((client) => {
      client.emit(event.eventType, {
        id: event.camera.id,
        camera,
      });
    });
  }

  @Subscribe('never_gateway/camera/+/created')
  handleCreated(
    @Payload()
    payload: {
      id: string;
      camera: Camera;
      gatewayID?: string;
    },
  ) {
    return this.camerasService.create(payload.camera, false);
  }

  @Subscribe('never_gateway/camera/+/deleted')
  handleDeleted(
    @Payload()
    payload: {
      id: string;
      camera: Camera;
      gatewayID?: string;
    },
  ) {
    return this.camerasService.delete(payload.id, false);
  }

  @Subscribe('never_gateway/camera/+/updated')
  handleUpdated(
    @Payload()
    payload: {
      id: string;
      camera: CameraUpdate;
      gatewayID?: string;
    },
  ) {
    return this.camerasService.update(
      payload.id,
      {
        stream: payload.camera.stream,
        record: payload.camera.record,
        name: payload.camera.name,
        status: payload.camera.status,
        timezone: payload.camera.timezone,
        synchronized: payload.camera.synchronized,
        lastConnection: payload.camera.lastConnection,
      },
      false,
    );
  }
}

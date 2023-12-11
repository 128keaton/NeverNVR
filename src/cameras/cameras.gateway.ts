import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Camera, CameraEvent, CameraUpdate } from './types';
import { Logger } from '@nestjs/common';
import { GatewaysService } from '../gateways/gateways.service';
import { CamerasService } from './cameras.service';
import { CommonGateway } from '../common/common-gateway';

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
  }

  handleCameraEvent(event: CameraEvent) {
    const client = this.getGatewayClient(event.camera.gatewayID);

    const camera = {
      ...event.camera,
      ...event.update,
      ...event.create,
    };

    delete camera.gatewayID;

    const didEmit = client.emit(event.eventType, {
      id: event.camera.id,
      camera,
    });

    // Get all UI clients (i.e. non gateway clients)
    const webClients = this.getWebClients();

    // Send the UI clients the same update
    webClients.forEach((client) => {
      client.emit(event.eventType, {
        id: event.camera.id,
        camera,
      });
    });

    if (!didEmit) this.logger.warn('Could not emit');

    return didEmit;
  }

  @SubscribeMessage('response')
  handleResponse(
    @MessageBody() response: { type: string; data?: any },
    @ConnectedSocket() client: Socket,
  ) {
    switch (response.type) {
      case 'identify':
        this.logger.verbose(
          `Client with ID ${client.id} returned gatewayID ${response.data.gatewayID}`,
        );
        this.associateGatewayID(client.id, response.data.gatewayID).then();
        break;
      default:
        this.logger.verbose(
          `Client with ID ${client.id} returned unknown response ${
            response.type
          } with data ${response.data || 'none'}`,
        );
        break;
    }
  }

  @SubscribeMessage('created')
  handleCreated(@MessageBody() request: { camera: Camera; id: string }) {
    return this.camerasService.create(request.camera, false);
  }

  @SubscribeMessage('deleted')
  handleDeleted(@MessageBody() request: { camera: Camera; id: string }) {
    return this.camerasService.delete(request.id, false);
  }

  @SubscribeMessage('updated')
  handleUpdated(@MessageBody() request: { camera: CameraUpdate; id: string }) {
    return this.camerasService.update(
      request.id,
      {
        stream: request.camera.stream,
        record: request.camera.record,
        name: request.camera.name,
        status: request.camera.status,
        timezone: request.camera.timezone,
        synchronized: request.camera.synchronized,
        lastConnection: request.camera.lastConnection,
      },
      false,
    );
  }
}

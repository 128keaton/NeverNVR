import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Camera, CameraEvent, CameraUpdate } from './types';
import { Logger } from '@nestjs/common';
import { GatewaySocket } from '../gateways/types/gateway.socket';
import { GatewaysService } from '../gateways/gateways.service';
import { CamerasService } from './cameras.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  path: '/cameras.io/',
})
export class CamerasGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private logger = new Logger(CamerasGateway.name);
  private clients: GatewaySocket[] = [];

  constructor(
    private gatewaysService: GatewaysService,
    private camerasService: CamerasService,
  ) {
    this.logger.verbose('Cameras gateway active');
  }

  handleCameraEvent(event: CameraEvent) {
    const gatewayClient = this.clients.find(
      (client) => client.gatewayID === event.camera.gatewayID,
    );

    this.logger.verbose(`handleCameraEvent: ${event.eventType}`);

    if (!gatewayClient)
      throw new Error(
        `Could not find a client for gateway ID ${event.camera.gatewayID}`,
      );
    else
      this.logger.verbose(
        `Sending message to client with ID ${gatewayClient.id} and gatewayID of ${gatewayClient.gatewayID}`,
      );

    const camera = {
      ...event.camera,
      ...event.update,
      ...event.create,
    };

    delete camera.gatewayID;

    const didEmit = gatewayClient.emit(event.eventType, {
      id: event.camera.id,
      camera,
    });

    if (!didEmit) this.logger.warn('Could not emit');

    return didEmit;
  }

  handleConnection(client: Socket): any {
    this.logger.debug(`New client: ${client.id}`);
    this.clients.push(client);
    client.emit('request', { type: 'identify' });
  }

  handleDisconnect(): any {
    const disconnectedClient = this.clients.find((client) => client.id);

    if (!!disconnectedClient) {
      this.logger.verbose(
        `Client with gatewayID ${disconnectedClient.gatewayID} has disconnected`,
      );
      this.clients.filter((c) => c.id !== disconnectedClient.id);
    }
  }

  @SubscribeMessage('response')
  handleResponse(
    @MessageBody() response: { type: string; data?: any },
    @ConnectedSocket() client: Socket,
  ) {
    switch (response.type) {
      case 'identify':
        this.logger.verbose(
          `Client with ID ${client.id} returned gatewayID ${response.data.gatewayID} and totalCameras ${response.data.totalCameras}`,
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

  private async associateGatewayID(clientID: string, gatewayID: string) {
    const client = this.clients.find((client) => client.id === clientID);

    if (!client) {
      this.logger.error(`Could not find client with ID ${clientID}`);
      return;
    }

    const gateway = await this.gatewaysService.get(gatewayID);

    if (!!gateway)
      await this.gatewaysService.updateStatus(gatewayID, 'CONNECTED');

    client.gatewayID = gatewayID;
  }
}

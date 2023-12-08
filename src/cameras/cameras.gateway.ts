import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Camera, CameraEvent } from './types';
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

    const camera = {
      ...event.camera,
      ...event.update,
      ...event.create,
    };

    delete camera.gatewayID;

    return gatewayClient.emit(event.eventType, {
      id: event.camera.id,
      camera,
    });
  }

  handleConnection(client: Socket, ...args: any[]): any {
    this.logger.debug(`New client: ${client.id}`);
    this.clients.push(client);
    client.emit('request', { type: 'gatewayID' });
  }

  handleDisconnect(client: Socket): any {
    this.clients.filter((c) => c.id !== client.id);
  }

  @SubscribeMessage('response')
  handleResponse(
    @MessageBody() response: { type: string; data?: any },
    @ConnectedSocket() client: Socket,
  ) {
    switch (response.type) {
      case 'gatewayID':
        this.logger.verbose(
          `Client with ID ${client.id} returned gatewayID ${response.data}`,
        );
        this.associateGatewayID(client.id, response.data).then();
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

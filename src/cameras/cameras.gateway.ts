import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { CameraEvent } from './types';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  path: '/cameras.io/',
})
export class CamerasGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private clients: Socket[] = [];

  constructor() {}

  handleCameraEvent(event: CameraEvent) {
    const gatewayClient = this.clients.find(
      (client) => client.id === event.camera.gatewayID,
    );

    if (!gatewayClient)
      throw new Error(
        `Could not find a client for gateway ID ${event.camera.gatewayID}`,
      );

    return gatewayClient.emit('camera', event);
  }

  handleConnection(client: Socket, ...args: any[]): any {
    this.clients.push(client);
  }

  handleDisconnect(client: Socket): any {
    this.clients.filter((c) => c.id !== client.id);
  }
}

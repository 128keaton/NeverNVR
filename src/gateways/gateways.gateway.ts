import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { CommonGateway } from '../common/common-gateway';
import { GatewayDiskSpace, GatewayStats } from './types';
import { GatewaysService } from './gateways.service';
import { Interval } from '@nestjs/schedule';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  path: '/gateways.io/',
})
export class GatewaysGateway extends CommonGateway {
  constructor(override gatewaysService: GatewaysService) {
    super(gatewaysService);
  }

  @Interval(1000 * 60)
  async checkForGateways() {
    this.logger.verbose('Checking for connected gateways');

    const gateways = await this.gatewaysService
      .getMany()
      .then((response) => response.data);

    gateways.forEach((gateway) => {
      const connectedClients = this.getGatewayClients(gateway.id);

      if (connectedClients.length === 0 && gateway.status !== 'DISCONNECTED') {
        return this.gatewaysService.updateStatus(gateway.id, 'DISCONNECTED');
      } else if (
        connectedClients.length > 0 &&
        gateway.status !== 'CONNECTED'
      ) {
        return this.gatewaysService.updateStatus(gateway.id, 'CONNECTED');
      }
    });
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

  @SubscribeMessage('request')
  handleRequest(
    @MessageBody()
    request: { type: 'diskSpace' | 'gatewayStats'; gatewayID: string },
    @ConnectedSocket() client: Socket,
  ) {
    switch (request.type) {
      case 'diskSpace':
        return this.gatewaysService
          .getDiskSpace(request.gatewayID)
          .then((diskSpace) => {
            client.emit('diskSpace', diskSpace);
          });

      case 'gatewayStats':
        return this.gatewaysService
          .getGatewayStats(request.gatewayID)
          .then((stats) => {
            client.emit('stats', stats);
          });

      default:
        this.logger.verbose(`Unknown request: ${request.type}`);
        break;
    }
  }

  @SubscribeMessage('diskSpace')
  handleDiskSpace(
    @MessageBody() response: { gatewayID: string; diskSpace: GatewayDiskSpace },
    @ConnectedSocket() sendingClient: Socket,
  ) {
    this.clients
      .filter((client) => client.id !== sendingClient.id)
      .forEach((client) => {
        client.emit('diskSpace', response);
      });
  }

  @SubscribeMessage('gatewayStats')
  handleStats(
    @MessageBody() response: { gatewayID: string; stats: GatewayStats },
    @ConnectedSocket() sendingClient: Socket,
  ) {
    this.clients
      .filter((client) => client.id !== sendingClient.id)
      .forEach((client) => {
        client.emit('stats', response);
      });
  }
}

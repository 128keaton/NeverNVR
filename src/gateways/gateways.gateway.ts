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

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  path: '/gateways.io/',
})
export class GatewaysGateway extends CommonGateway {
  constructor(override gatewaysService: GatewaysService) {
    super(gatewaysService);
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
    @MessageBody() request: { type: 'diskSpace' | 'stats'; gatewayID: string },
    @ConnectedSocket() client: Socket,
  ) {
    switch (request.type) {
      case 'diskSpace':
        return this.gatewaysService
          .getDiskSpace(request.gatewayID)
          .then((diskSpace) => {
            client.emit('diskSpace', diskSpace);
          });

      case 'stats':
        return this.gatewaysService
          .getStats(request.gatewayID)
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
    this.logger.verbose('diskSpace');
    this.clients
      .filter((client) => client.id !== sendingClient.id)
      .forEach((client) => {
        client.emit('diskSpace', response);
      });
  }

  @SubscribeMessage('stats')
  handleStats(
    @MessageBody() response: { gatewayID: string; stats: GatewayStats },
    @ConnectedSocket() sendingClient: Socket,
  ) {
    this.logger.verbose('stats');
    this.clients
      .filter((client) => client.id !== sendingClient.id)
      .forEach((client) => {
        client.emit('stats', response);
      });
  }
}

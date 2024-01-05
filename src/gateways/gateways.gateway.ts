import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { CommonGateway } from '../common/common-gateway';
import { GatewayDiskSpace, GatewayEvent, GatewayStats } from './types';
import { GatewaysService } from './gateways.service';
import { Interval } from '@nestjs/schedule';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  path: '/gateways.io/',
})
export class GatewaysGateway extends CommonGateway {
  constructor(override gatewaysService: GatewaysService) {
    super(gatewaysService);

    this.gatewaysService.gatewayEvents.subscribe((event) => {
      this.handleGatewayEvent(event);
    });
  }

  private handleGatewayEvent(event: GatewayEvent) {
    // Get all UI clients (i.e. non gateway clients)
    const webClients = this.getWebClients();

    // Send the UI clients the same update
    webClients.forEach((client) => {
      client.emit(event.eventType, {
        id: event.id,
        gateway: event.gateway,
      });
    });
  }

  @Interval(1000 * 60)
  async checkForGateways() {
    const gateways = await this.gatewaysService
      .getMany()
      .then((response) => response.data);

    if (gateways.length === 0) return;

    this.logger.verbose(
      `We have ${gateways.length} gateway(s) to check for connection`,
    );

    for (const gateway of gateways) {
      const connectedClients = this.getGatewayClients(gateway.id);

      this.logger.verbose(
        `Gateway '${gateway.id}' has ${connectedClients.length} client(s) connected (need 1)`,
      );

      if (connectedClients.length === 0) {
        if (gateway.status === 'DISCONNECTED')
          this.logger.warn(`Gateway '${gateway.id}' is still disconnected`);

        // Update anyway just in case cameras did not get updated
        this.gatewaysService
          .updateStatus(gateway.id, 'DISCONNECTED')
          .then(() => {
            this.logger.verbose(`Gateway '${gateway.id}' is now disconnected`);
          });
      } else if (
        connectedClients.length > 0 &&
        gateway.status !== 'CONNECTED'
      ) {
        await this.gatewaysService.updateStatus(gateway.id, 'CONNECTED');
        this.logger.verbose(`Gateway '${gateway.id}' is now connected`);
      }
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

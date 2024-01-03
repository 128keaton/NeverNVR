import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import { CommonGateway } from '../common/common-gateway';
import { GatewaysService } from '../gateways/gateways.service';
import { StatsService } from './stats.service';
import { Socket } from 'socket.io';
import { Stats } from './types';
import { Interval } from '@nestjs/schedule';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  path: '/stats.io/',
})
export class StatsGateway extends CommonGateway {
  constructor(
    override gatewaysService: GatewaysService,
    private statsService: StatsService,
  ) {
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

  @SubscribeMessage('stats')
  async handleStatsRequest(): Promise<WsResponse<Stats>> {
    const data = await this.statsService.countAll();

    return { event: 'stats', data };
  }

  @Interval('emitStats', 1000 * 60)
  emitStats() {
    this.statsService.countAll().then((data) => {
      this.clients.forEach((client) => {
        client.emit('stats', data);
      });
    });
  }
}

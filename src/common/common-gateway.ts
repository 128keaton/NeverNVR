import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { GatewaySocket } from './gateway.socket';
import { GatewaysService } from '../gateways/gateways.service';
import { Socket } from 'socket.io';

export class CommonGateway implements OnGatewayConnection, OnGatewayDisconnect {
  logger = new Logger(CommonGateway.name);
  protected clients: GatewaySocket[] = [];

  constructor(protected gatewaysService: GatewaysService) {
    this.logger.verbose('Snapshots gateway active');
  }

  handleConnection(client: Socket): any {
    this.logger.debug(`New client: ${client.id}`);
    this.clients.push(client);
    client.emit('request', { type: 'identify' });
  }

  handleDisconnect(): any {
    const disconnectedClient = this.clients.find((client) => client.id);

    if (!!disconnectedClient) {
      if (!!disconnectedClient.gatewayID)
        this.logger.verbose(
          `Client with gatewayID ${disconnectedClient.gatewayID} has disconnected`,
        );
      else
        this.logger.verbose(
          `Client with ID ${disconnectedClient.id} has disconnected`,
        );

      this.clients.filter((c) => c.id !== disconnectedClient.id);
    }
  }

  async associateGatewayID(clientID: string, gatewayID: string) {
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

  getGatewayClient(gatewayID: string) {
    const gatewayClient = this.clients.find(
      (client) => client.gatewayID === gatewayID,
    );

    if (!gatewayClient) return null;
    else return gatewayClient;
  }

  getWebClients() {
    return this.clients.filter((client) => client.gatewayID === undefined);
  }

  getGatewayIDFromClientID(clientID: string) {
    const gatewayClient = this.clients.find((client) => client.id === clientID);

    return gatewayClient.gatewayID;
  }
}

import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { GatewaysService } from '../gateways/gateways.service';
import { SnapshotsService } from './snapshots.service';
import { CommonGateway } from '../common/common-gateway';
import { Socket } from 'socket.io';
import { Snapshot, SnapshotEvent } from './types';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  path: '/snapshots.io/',
})
export class SnapshotsGateway extends CommonGateway {
  override logger = new Logger(SnapshotsGateway.name);

  constructor(
    override gatewaysService: GatewaysService,
    private snapshotsService: SnapshotsService,
  ) {
    super(gatewaysService);
    this.logger.verbose('Snapshots gateway active');
  }

  handleSnapshotEvent(event: SnapshotEvent) {
    const client = this.getGatewayClient(event.snapshot.gatewayID);
    const snapshot = {
      ...event.snapshot,
      ...event.update,
      ...event.create,
    };

    delete snapshot.gatewayID;

    const didEmit = client.emit(event.eventType, {
      id: event.snapshot.id,
      snapshot,
      cameraName: event.cameraName,
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
  handleCreated(
    @MessageBody()
    request: {
      snapshot: Snapshot;
      id: string;
      cameraName: string;
      gatewayID: string;
    },
  ) {
    return this.snapshotsService.create(
      {
        ...request.snapshot,
        id: request.id,
        cameraName: request.cameraName,
        gatewayID: request.gatewayID,
      },
      false,
    );
  }
}

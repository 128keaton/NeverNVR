import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { GatewaysService } from '../gateways/gateways.service';
import { SnapshotsService } from './snapshots.service';
import { CommonGateway } from '../common/common-gateway';
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

    this.snapshotsService.snapshotEvents.subscribe((event) => {
      this.handleSnapshotEvent(event);
    });
  }

  handleSnapshotEvent(event: SnapshotEvent) {
    const snapshot = {
      ...event.snapshot,
      ...event.update,
      ...event.create,
    };

    delete snapshot.gatewayID;

    // Get all UI clients (i.e. non gateway clients)
    const webClients = this.getWebClients();

    // Send the UI clients the same update
    webClients.forEach((client) => {
      client.emit(event.eventType, {
        id: event.snapshot.id,
        snapshot,
        cameraID: event.cameraID,
      });
    });
  }

  @SubscribeMessage('created')
  handleCreated(
    @MessageBody()
    request: {
      snapshot: Snapshot;
      id: string;
      cameraID: string;
      gatewayID: string;
    },
  ) {
    return this.snapshotsService.create(
      {
        ...request.snapshot,
        id: request.id,
        cameraID: request.cameraID,
        gatewayID: request.gatewayID,
      },
      false,
    );
  }

  @SubscribeMessage('deleted')
  handleDeleted(
    @MessageBody()
    request: {
      deleted: Snapshot;
      id: string;
    },
  ) {
    return this.snapshotsService.delete(request.id, false);
  }

  @SubscribeMessage('updated')
  handleUpdated(
    @MessageBody()
    request: {
      snapshot: Snapshot;
      id: string;
    },
  ) {
    return this.snapshotsService.update(request.id, request.snapshot, false);
  }
}

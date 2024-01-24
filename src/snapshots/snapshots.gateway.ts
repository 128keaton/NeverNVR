import { WebSocketGateway } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { GatewaysService } from '../gateways/gateways.service';
import { SnapshotsService } from './snapshots.service';
import { CommonGateway } from '../common/common-gateway';
import { SnapshotCreate, SnapshotEvent, SnapshotUpdate } from './types';
import { Payload, Subscribe } from '@vipstorage/nest-mqtt';

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

  @Subscribe('never_gateway/snapshot/+/created')
  handleCreated(
    @Payload()
    payload: {
      id: string;
      snapshot: SnapshotCreate;
      gatewayID?: string;
      cameraID?: string;
    },
  ) {
    return this.snapshotsService
      .create(
        {
          ...payload.snapshot,
          id: payload.id,
          cameraID: payload.cameraID,
          gatewayID: payload.gatewayID,
        },
        false,
      )
      .catch((err) => {
        this.logger.error(err);
        return null;
      });
  }

  @Subscribe('never_gateway/snapshot/+/deleted')
  handleDeleted(
    @Payload()
    payload: {
      id: string;
      deleted: SnapshotCreate;
      gatewayID?: string;
    },
  ) {
    return this.snapshotsService.delete(payload.id, false);
  }

  @Subscribe('never_gateway/snapshot/+/updated')
  handleUpdated(
    @Payload()
    payload: {
      id: string;
      snapshot: SnapshotUpdate;
      gatewayID?: string;
    },
  ) {
    return this.snapshotsService.update(payload.id, payload.snapshot, false);
  }
}

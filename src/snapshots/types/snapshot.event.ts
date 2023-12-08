import { Snapshot } from './snapshot.type';
import { SnapshotUpdate } from './snapshot.update';
import { SnapshotCreate } from './snapshot.create';

export type SnapshotEvent = {
  snapshot: Snapshot;
  eventType: 'updated' | 'created' | 'deleted' | 'sync';
  update?: SnapshotUpdate;
  create?: SnapshotCreate;
  cameraName?: string;
};

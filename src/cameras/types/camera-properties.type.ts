import { CameraMode } from '@prisma/client';

export type CameraProperties = {
  name?: string;
  host: string;
  streamURL?: string;
  snapshotURL?: string;
  username?: string;
  password?: string;
  mode?: CameraMode;
  timezone?: string;
  deleteClipAfter?: number;
  deleteSnapshotAfter?: number;
  segmentTime?: number;
  onvifURL?: string;
  onvifUsername?: string;
  onvifPassword?: string;
};

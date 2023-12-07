import { Camera } from '@prisma/client';
import { CameraUpdate } from './camera.update';
import { CameraCreate } from './camera.create';

export type CameraEvent = {
  camera: Camera;
  eventType: 'updated' | 'created' | 'deleted' | 'sync';
  update?: CameraUpdate;
  create?: CameraCreate;
};

import { Clip } from './clip.type';

export type ClipEvent = {
  clip: Clip;
  eventType: 'updated' | 'created' | 'deleted' | 'sync';
  cameraName?: string;
};

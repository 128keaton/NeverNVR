import { Timelapse } from '@prisma/client';

export type TimelapseEvent = {
  timelapse: Timelapse;
  eventType: 'updated' | 'created' | 'deleted' | 'sync';
};

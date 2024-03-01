import { Job } from '@prisma/client';

export type ClipJobEvent = {
  job: Job;
  eventType: 'updated' | 'created' | 'deleted';
};

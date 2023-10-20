import { registerAs } from '@nestjs/config';
import * as process from 'process';

export default registerAs('cameras', () => ({
  clipStoragePath: process.env.CLIP_STORAGE_PATH || '/tmp/clips',
  snapshotStoragePath: process.env.SNAPSHOT_STORAGE_PATH || '/tmp/snapshots',
}));

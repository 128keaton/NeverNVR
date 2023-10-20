import { registerAs } from '@nestjs/config';
import * as process from 'process';

export default registerAs('clips', () => ({
  storagePath: process.env.CLIP_STORAGE_PATH || '/tmp/clips',
}));

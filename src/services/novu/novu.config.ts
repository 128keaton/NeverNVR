import { registerAs } from '@nestjs/config';
import * as process from 'process';

export default registerAs('novu', () => ({
  key: process.env.NOVU_KEY || '',
  tenantID: process.env.NOVU_TENANT_KEY || 'copcart',
}));

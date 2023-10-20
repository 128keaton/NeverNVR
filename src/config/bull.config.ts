import { ConfigService } from '@nestjs/config';
import { BullRootModuleOptions } from '@nestjs/bull/dist/interfaces/bull-module-options.interface';

export const bullConfig = (
  configService: ConfigService,
): BullRootModuleOptions => {
  const redisURL = configService.get('REDIS_URL');
  const isDev =
    (configService.get('NODE_ENV') || 'development') === 'development';

  const options = {
    defaultJobOptions: {
      removeOnComplete: true,
      attempts: 2,
      removeOnFail: {
        count: 150,
      },
    },
  };

  if (!!redisURL && !isDev) {
    console.log('Using production REDIS url', redisURL);
    return {
      ...options,
      redis: {
        password: redisURL.split('@')[0].split(':')[2],
        host: redisURL.split('@')[1].split(':')[0],
        port: parseInt(redisURL.split('@')[1].split(':')[1]),
        tls: {
          rejectUnauthorized: false,
        },
      },
    };
  }

  console.log('Using development REDIS url', redisURL);
  return {
    ...options,
    url: redisURL,
  };
};

import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino/params';


const isProduction = (configService: ConfigService) => {
  const env = configService.get('NODE_ENV') || 'dev';

  return env === 'production';
};

const debugRequests = (configService: ConfigService) => {
  return configService.get('DEBUG_REQUESTS') || false;
};

export const loggerConfig = (configService: ConfigService): Params => {
  if (isProduction(configService) || debugRequests(configService)) {
    return {
      pinoHttp: {
        autoLogging: true,
        level: configService.get('LOG_LEVEL') || 'trace',
        customProps: () => ({
          context: 'HTTP',
        }),
      },
    };
  } else {
    return {
      pinoHttp: {
        level: configService.get('LOG_LEVEL') || 'trace',
        autoLogging: debugRequests(configService),
        customProps: () => ({
          context: 'HTTP',
        }),
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: false,
          },
        },
      },
    };
  }
};

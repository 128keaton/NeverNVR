import { Module } from '@nestjs/common';
import { CamerasService } from './cameras.service';
import { PrismaModule } from '../services/prisma/prisma.module';
import { CamerasGateway } from './cameras.gateway';
import { CamerasQueue } from './cameras.queue';
import { CamerasController } from './cameras.controller';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { GatewaysModule } from '../gateways/gateways.module';
import { AmazonModule } from '../services/s3/amazon.module';
import { GatewayEventsModule } from '../gateway-events/gateway-events.module';
import { CacheModule } from '@nestjs/cache-manager';
import type { RedisClientOptions } from 'redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { StoreConfig } from 'cache-manager';
import { CamerasISAPIService } from './cameras-isapi.service';

@Module({
  controllers: [CamerasController],
  providers: [
    CamerasService,
    CamerasISAPIService,
    CamerasGateway,
    CamerasQueue,
  ],
  imports: [
    PrismaModule,
    HttpModule,
    BullModule.registerQueue({
      name: 'cameras',
    }),
    GatewaysModule,
    AmazonModule,
    GatewayEventsModule,
    CacheModule.registerAsync<RedisClientOptions>({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const url = configService.get('REDIS_URL');
        return {
          store: redisStore,
          url,
        } as StoreConfig;
      },
    }),
  ],
  exports: [CamerasService, CamerasISAPIService, CamerasGateway],
})
export class CamerasModule {}

import { Module } from '@nestjs/common';
import { ClipsService } from './clips.service';
import { PrismaModule } from '../services/prisma/prisma.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { BullModule } from '@nestjs/bull';
import { S3Module } from '../services/s3/s3.module';
import { ClipsGateway } from './clips.gateway';
import { ClipsQueue } from './clips.queue';
import { ClipsController } from './clips.controller';
import { VideoAnalyticsModule } from '../video-analytics/video-analytics.module';
import { GatewayEventsModule } from '../gateway-events/gateway-events.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import type { RedisClientOptions } from 'redis';
import { StoreConfig } from 'cache-manager';

@Module({
  providers: [ClipsService, ClipsGateway, ClipsQueue],
  exports: [ClipsService],
  imports: [
    S3Module,
    PrismaModule,
    GatewaysModule,
    VideoAnalyticsModule,
    BullModule.registerQueue({
      name: 'clips',
    }),
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
    GatewayEventsModule,
  ],
  controllers: [ClipsController],
})
export class ClipsModule {}

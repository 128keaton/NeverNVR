import { Module } from '@nestjs/common';
import { SnapshotsService } from './snapshots.service';
import { SnapshotsController } from './snapshots.controller';
import { SnapshotsGateway } from './snapshots.gateway';
import { PrismaModule } from '../services/prisma/prisma.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { SnapshotsQueue } from './snapshots.queue';
import { BullModule } from '@nestjs/bull';
import { AmazonModule } from '../services/s3/amazon.module';
import { VideoAnalyticsModule } from '../video-analytics/video-analytics.module';
import { GatewayEventsModule } from '../gateway-events/gateway-events.module';
import { CacheModule } from '@nestjs/cache-manager';
import type { RedisClientOptions } from 'redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { StoreConfig } from 'cache-manager';

@Module({
  providers: [SnapshotsService, SnapshotsGateway, SnapshotsQueue],
  controllers: [SnapshotsController],
  exports: [SnapshotsGateway, SnapshotsService],
  imports: [
    AmazonModule,
    VideoAnalyticsModule,
    PrismaModule,
    GatewaysModule,
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
    BullModule.registerQueue({
      name: 'snapshots',
    }),
  ],
})
export class SnapshotsModule {}

import { Module } from '@nestjs/common';
import { ClipsService } from './services/clips.service';
import { PrismaModule } from '../services/prisma/prisma.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { BullModule } from '@nestjs/bull';
import { AmazonModule } from '../services/s3/amazon.module';
import { ClipsGateway } from './clips.gateway';
import { ClipsQueue } from './queues/clips.queue';
import { ClipsController } from './clips.controller';
import { VideoAnalyticsModule } from '../video-analytics/video-analytics.module';
import { GatewayEventsModule } from '../gateway-events/gateway-events.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import type { RedisClientOptions } from 'redis';
import { StoreConfig } from 'cache-manager';
import { HttpModule } from '@nestjs/axios';
import { ClipJobsService } from './services/clip-jobs.service';
import { ClipJobsQueue } from './queues/clip-jobs.queue';

@Module({
  providers: [
    ClipsGateway,
    ClipsService,
    ClipJobsService,
    ClipsQueue,
    ClipJobsQueue,
  ],
  exports: [ClipsService],
  imports: [
    AmazonModule,
    PrismaModule,
    GatewaysModule,
    VideoAnalyticsModule,
    BullModule.registerQueue({
      name: 'clips',
    }),
    BullModule.registerQueue({
      name: 'clipJobs',
    }),
    HttpModule,
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

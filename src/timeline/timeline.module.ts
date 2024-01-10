import { Module } from '@nestjs/common';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';
import { ClipsModule } from '../clips/clips.module';
import { SnapshotsModule } from '../snapshots/snapshots.module';
import { CacheModule } from '@nestjs/cache-manager';
import type { RedisClientOptions } from 'redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { StoreConfig } from 'cache-manager';

@Module({
  controllers: [TimelineController],
  providers: [TimelineService],
  imports: [
    ClipsModule,
    SnapshotsModule,
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
  exports: [TimelineService],
})
export class TimelineModule {}

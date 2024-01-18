import { Module } from '@nestjs/common';
import { OnvifService } from './onvif.service';
import { CamerasModule } from '../cameras/cameras.module';
import { OnvifController } from './onvif.controller';
import { GatewaysModule } from '../gateways/gateways.module';
import { HttpModule } from '@nestjs/axios';
import { OnvifGateway } from './onvif.gateway';
import { CacheModule } from '@nestjs/cache-manager';
import type { RedisClientOptions } from 'redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { StoreConfig } from 'cache-manager';

@Module({
  providers: [OnvifService, OnvifGateway],
  imports: [
    CamerasModule,
    GatewaysModule,
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
  ],
  exports: [OnvifService, OnvifGateway],
  controllers: [OnvifController],
})
export class OnvifModule {}

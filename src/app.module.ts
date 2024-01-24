import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './services/prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { bullConfig } from './config/bull.config';
import { BullModule } from '@nestjs/bull';
import { CamerasModule } from './cameras/cameras.module';
import { GatewaysModule } from './gateways/gateways.module';
import { SnapshotsModule } from './snapshots/snapshots.module';
import { ClipsModule } from './clips/clips.module';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { StatsModule } from './stats/stats.module';
import { VideoAnalyticsModule } from './video-analytics/video-analytics.module';
import { GatewayEventsModule } from './gateway-events/gateway-events.module';
import { TimelineModule } from './timeline/timeline.module';
import { TimelapseModule } from './timelapse/timelapse.module';
import { OnvifModule } from './onvif/onvif.module';
import { AppExceptionsFilter } from './app.exceptions';
import { APP_FILTER } from '@nestjs/core';
import { AppLogger } from './app.logger';
import { LoggerModule } from 'nestjs-pino';
import { loggerConfig } from './config/logger.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRootAsync({
      useFactory: (configService: ConfigService) => loggerConfig(configService),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => bullConfig(configService),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client', 'dist', 'never_ui'),
    }),
    AuthModule,
    PrismaModule,
    CamerasModule,
    GatewaysModule,
    SnapshotsModule,
    UsersModule,
    ClipsModule,
    UsersModule,
    StatsModule,
    VideoAnalyticsModule,
    GatewayEventsModule,
    TimelineModule,
    TimelapseModule,
    OnvifModule,
  ],
  providers: [
    AppLogger,
    {
      provide: APP_FILTER,
      useClass: AppExceptionsFilter,
    },
  ],
})
export class AppModule {}
// function loggerConfig(configService: ConfigService<Record<string, unknown>, false>): import("nestjs-pino").Params | Promise<import("nestjs-pino").Params> {
//     throw new Error('Function not implemented.');
// }

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => bullConfig(configService),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client', 'dist', 'never_ui'),
    }),
    PrismaModule,
    CamerasModule,
    GatewaysModule,
    SnapshotsModule,
    ClipsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

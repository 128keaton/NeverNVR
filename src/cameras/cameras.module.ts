import { Module } from '@nestjs/common';
import { CamerasService } from './cameras.service';
import { PrismaModule } from '../services/prisma/prisma.module';
import { CamerasController } from './cameras.controller';
import { BullModule } from '@nestjs/bull';
import { CamerasConsumer } from './cameras.consumer';
import camerasConfig from './cameras.config';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [CamerasService, CamerasConsumer],
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'camera',
    }),
    ConfigModule.forFeature(camerasConfig),
  ],
  exports: [CamerasService, CamerasConsumer],
  controllers: [CamerasController],
})
export class CamerasModule {}

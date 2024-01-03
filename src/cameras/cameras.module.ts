import { Module } from '@nestjs/common';
import { CamerasService } from './cameras.service';
import { PrismaModule } from '../services/prisma/prisma.module';
import { CamerasGateway } from './cameras.gateway';
import { CamerasQueue } from './cameras.queue';
import { CamerasController } from './cameras.controller';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { GatewaysModule } from '../gateways/gateways.module';
import { S3Module } from '../services/s3/s3.module';
import { GatewayEventsModule } from '../gateway-events/gateway-events.module';

@Module({
  controllers: [CamerasController],
  providers: [CamerasService, CamerasGateway, CamerasQueue],
  imports: [
    PrismaModule,
    HttpModule,
    BullModule.registerQueue({
      name: 'cameras',
    }),
    GatewaysModule,
    S3Module,
    GatewayEventsModule,
  ],
  exports: [CamerasService, CamerasGateway],
})
export class CamerasModule {}

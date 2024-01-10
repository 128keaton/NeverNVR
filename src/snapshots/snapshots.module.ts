import { Module } from '@nestjs/common';
import { SnapshotsService } from './snapshots.service';
import { SnapshotsController } from './snapshots.controller';
import { SnapshotsGateway } from './snapshots.gateway';
import { PrismaModule } from '../services/prisma/prisma.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { SnapshotsQueue } from './snapshots.queue';
import { BullModule } from '@nestjs/bull';
import { S3Module } from '../services/s3/s3.module';
import { VideoAnalyticsModule } from '../video-analytics/video-analytics.module';
import { GatewayEventsModule } from '../gateway-events/gateway-events.module';

@Module({
  providers: [SnapshotsService, SnapshotsGateway, SnapshotsQueue],
  controllers: [SnapshotsController],
  exports: [SnapshotsGateway, SnapshotsService],
  imports: [
    S3Module,
    VideoAnalyticsModule,
    PrismaModule,
    GatewaysModule,
    GatewayEventsModule,
    BullModule.registerQueue({
      name: 'snapshots',
    }),
  ],
})
export class SnapshotsModule {}

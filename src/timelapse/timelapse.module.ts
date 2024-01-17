import { Module } from '@nestjs/common';
import { TimelapseService } from './timelapse.service';
import { TimelapseController } from './timelapse.controller';
import { PrismaModule } from '../services/prisma/prisma.module';
import { VideoAnalyticsModule } from '../video-analytics/video-analytics.module';
import { BullModule } from '@nestjs/bull';
import { TimelapseQueue } from './timelapse.queue';
import { S3Module } from '../services/s3/s3.module';
import { SnapshotsModule } from '../snapshots/snapshots.module';
import { TimelapseGateway } from './timelapse.gateway';

@Module({
  providers: [TimelapseService, TimelapseQueue, TimelapseGateway],
  controllers: [TimelapseController],
  imports: [
    PrismaModule,
    SnapshotsModule,
    S3Module,
    VideoAnalyticsModule,
    BullModule.registerQueue({
      name: 'timelapse',
    }),
  ],
  exports: [TimelapseService, TimelapseGateway],
})
export class TimelapseModule {}

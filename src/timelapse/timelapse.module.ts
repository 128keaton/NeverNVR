import { Module } from '@nestjs/common';
import { TimelapseService } from './timelapse.service';
import { TimelapseController } from './timelapse.controller';
import { PrismaModule } from '../services/prisma/prisma.module';
import { VideoAnalyticsModule } from '../video-analytics/video-analytics.module';
import { BullModule } from '@nestjs/bull';
import { TimelapseQueue } from './timelapse.queue';
import { AmazonModule } from '../services/s3/amazon.module';
import { SnapshotsModule } from '../snapshots/snapshots.module';
import { TimelapseGateway } from './timelapse.gateway';

@Module({
  providers: [TimelapseService, TimelapseQueue, TimelapseGateway],
  controllers: [TimelapseController],
  imports: [
    PrismaModule,
    SnapshotsModule,
    AmazonModule,
    VideoAnalyticsModule,
    BullModule.registerQueue({
      name: 'timelapse',
    }),
  ],
  exports: [TimelapseService, TimelapseGateway],
})
export class TimelapseModule {}

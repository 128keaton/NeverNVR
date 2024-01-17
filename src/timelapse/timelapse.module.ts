import { Module } from '@nestjs/common';
import { TimelapseService } from './timelapse.service';
import { TimelapseController } from './timelapse.controller';
import { PrismaModule } from '../services/prisma/prisma.module';
import { VideoAnalyticsModule } from '../video-analytics/video-analytics.module';
import { BullModule } from '@nestjs/bull';
import { TimelapseQueue } from './timelapse.queue';

@Module({
  providers: [TimelapseService, TimelapseQueue],
  controllers: [TimelapseController],
  imports: [
    PrismaModule,
    VideoAnalyticsModule,
    BullModule.registerQueue({
      name: 'timelapse',
    }),
  ],
  exports: [TimelapseService],
})
export class TimelapseModule {}

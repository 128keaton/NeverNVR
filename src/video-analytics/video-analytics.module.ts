import { Module } from '@nestjs/common';
import { VideoAnalyticsService } from './video-analytics.service';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';

@Module({
  providers: [VideoAnalyticsService],
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: 'clips',
    }),
    BullModule.registerQueue({
      name: 'snapshots',
    }),
  ],
  exports: [VideoAnalyticsService],
})
export class VideoAnalyticsModule {}

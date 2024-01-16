import { Module } from '@nestjs/common';
import { TimelapseService } from './timelapse.service';
import { TimelapseController } from './timelapse.controller';
import { PrismaModule } from "../services/prisma/prisma.module";
import { VideoAnalyticsModule } from "../video-analytics/video-analytics.module";

@Module({
  providers: [TimelapseService],
  controllers: [TimelapseController],
  imports: [PrismaModule, VideoAnalyticsModule],
  exports: [TimelapseService]
})
export class TimelapseModule {}

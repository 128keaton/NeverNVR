import { Module } from '@nestjs/common';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';
import { ClipsModule } from '../clips/clips.module';
import { SnapshotsModule } from '../snapshots/snapshots.module';

@Module({
  controllers: [TimelineController],
  providers: [TimelineService],
  imports: [ClipsModule, SnapshotsModule],
  exports: [TimelineService],
})
export class TimelineModule {}

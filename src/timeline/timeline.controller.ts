import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { TimelineService } from './timeline.service';
import { TimelineRequest } from './requests';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@Controller('timeline')
@ApiTags('Timeline')
export class TimelineController {
  constructor(private timelineService: TimelineService) {}

  @Post('')
  @ApiParam({
    name: 'cameraID',
  })
  @ApiBody({
    type: TimelineRequest,
  })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(15000)
  createTimeline(@Body() request: TimelineRequest) {
    return this.timelineService.getTimeline(
      request.clipIDs,
      request.snapshotIDs,
    );
  }
}

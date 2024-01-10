import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { TimelineService } from './timeline.service';
import { TimelineRequest } from './requests';

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
  createTimeline(@Body() request: TimelineRequest) {
    return this.timelineService.getTimeline(
      request.clipIDs,
      request.snapshotIDs,
    );
  }
}

import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { TimelineService } from './timeline.service';
import { TimelineRequest } from './requests';

@Controller('timeline')
@ApiTags('Timeline')
export class TimelineController {
  constructor(private timelineService: TimelineService) {}

  @Post(':cameraID')
  @ApiParam({
    name: 'cameraID',
  })
  @ApiBody({
    type: TimelineRequest,
  })
  createTimeline(
    @Param('cameraID') cameraID: string,
    @Body() request: TimelineRequest,
  ) {
    return this.timelineService.getTimeline(
      cameraID,
      request.clipIDs,
      request.snapshotIDs,
    );
  }
}

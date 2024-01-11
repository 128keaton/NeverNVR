import {
  Body,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { TimelineService } from './timeline.service';
import { TimelineRequest } from './requests';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { AuthGuard } from '@nestjs/passport';

@Controller('timeline')
@ApiTags('Timeline')
@UseGuards(AuthGuard(['jwt', 'api-key']))
@ApiSecurity('api-key')
@ApiBearerAuth()
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

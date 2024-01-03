import { Controller, Get, Param, Query } from '@nestjs/common';
import { SingleStatCount, SizeStat, Stats } from './types';
import { StatsService } from './stats.service';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('stats')
@ApiTags('Stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get()
  @ApiResponse({
    status: 200,
    type: Stats,
  })
  allStats() {
    return this.statsService.countAll();
  }

  @Get('cameras')
  @ApiResponse({
    status: 200,
    type: SingleStatCount,
  })
  cameras() {
    return this.statsService.countCameras();
  }

  @Get('clips')
  @ApiQuery({
    name: 'cameraID',
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    type: SingleStatCount,
  })
  clips(@Query('cameraID') cameraID?: string) {
    return this.statsService.countClips(cameraID);
  }

  @Get('snapshots')
  @ApiQuery({
    name: 'cameraID',
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    type: SingleStatCount,
  })
  snapshots(@Query('cameraID') cameraID?: string) {
    return this.statsService.countSnapshots(cameraID);
  }

  @Get('bucketSize/:bucket')
  @ApiResponse({
    status: 200,
    type: SizeStat,
    isArray: true,
  })
  @ApiParam({
    name: 'bucket',
    type: String,
  })
  bucketSize(@Param('bucket') bucket: string) {
    return this.statsService.getGatewayBucketSize(bucket);
  }
}

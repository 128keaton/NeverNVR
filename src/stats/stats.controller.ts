import { Controller, Get, Query } from '@nestjs/common';
import { SingleStatCount, Stats } from './types';
import { StatsService } from './stats.service';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';

@Controller('stats')
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
}

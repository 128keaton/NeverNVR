import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TimelapseService } from './timelapse.service';
import { TimelapseCreate } from './types';
import { ApiBody, ApiOperation } from '@nestjs/swagger';

@Controller('timelapse')
export class TimelapseController {
  constructor(private timelapseService: TimelapseService) {}

  @Post()
  @ApiBody({
    type: TimelapseCreate,
  })
  @ApiOperation({ summary: 'Create a timelapse' })
  createTimelapse(@Body() request: TimelapseCreate) {
    return this.timelapseService.createTimelapse(request);
  }

  @Get(':timelapseID')
  @ApiOperation({ summary: 'Get a timelapse' })
  getTimelapse(@Param('timelapseID') timelapseID: string) {
    return this.timelapseService.getTimelapse(timelapseID);
  }
}

import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TimelapseService } from './timelapse.service';
import { TimelapseCreate } from './types';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { SnapshotsResponse } from '../snapshots/types';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Timelapse')
@Controller('timelapse')
@UseGuards(AuthGuard(['jwt', 'api-key']))
@ApiSecurity('api-key')
@ApiBearerAuth()
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

  @Delete(':timelapseID')
  @ApiOperation({ summary: 'Delete a timelapse' })
  deleteTimelapse(@Param('timelapseID') timelapseID: string) {
    return this.timelapseService.deleteTimelapse(timelapseID);
  }

  @Get(':timelapseID/url')
  @ApiOperation({ summary: 'Get a timelapses download URL' })
  getTimelapseDownloadURL(@Param('timelapseID') timelapseID: string) {
    return this.timelapseService.getTimelapseDownloadURL(timelapseID);
  }

  @Get()
  @ApiQuery({
    name: 'search',
    required: false,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    example: 40,
    type: Number,
  })
  @ApiQuery({
    name: 'pageNumber',
    required: false,
    example: 0,
    type: Number,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    example: 'start',
    type: String,
    enum: [
      'fileName',
      'id',
      'fileSize',
      'width',
      'height',
      'duration',
      'format',
      'start',
      'end',
      'cameraID',
      'days',
      'generating',
    ],
  })
  @ApiQuery({
    name: 'sortDirection',
    required: false,
    example: 'desc',
    type: String,
    enum: ['asc', 'desc', ''],
  })
  @ApiQuery({
    name: 'dateStart',
    required: false,
    example: new Date(),
    type: Date,
  })
  @ApiQuery({
    name: 'dateEnd',
    required: false,
    example: new Date(),
    type: Date,
  })
  @ApiQuery({
    name: 'gatewayID',
    required: false,
    type: String,
  })
  getTimelapses(
    @Query('pageSize') pageSize = 40,
    @Query('pageNumber') pageNumber = 0,
    @Query('sortBy', new DefaultValuePipe('end')) sortBy: string,
    @Query('sortDirection', new DefaultValuePipe('desc'))
    sortDirection: 'asc' | 'desc' | '',
    @Query('search') search?: string,
    @Query('dateStart') dateStart?: Date,
    @Query('dateEnd') dateEnd?: Date,
    @Query('gatewayID') gatewayID?: string,
    @Query('showAvailableOnly') showAvailableOnly?: string,
  ) {
    return this.timelapseService.getTimelapses(
      undefined,
      pageSize,
      pageNumber,
      search,
      sortBy,
      sortDirection,
      dateStart,
      dateEnd,
      gatewayID,
      showAvailableOnly,
    );
  }

  @Get('fileNames/:cameraID')
  @ApiOperation({ summary: 'List available snapshot file names for camera' })
  @ApiResponse({
    status: 200,
    description: 'The snapshots for the given camera ID',
    type: SnapshotsResponse,
  })
  @ApiQuery({
    name: 'dateStart',
    required: false,
    example: new Date(),
    type: Date,
  })
  @ApiQuery({
    name: 'dateEnd',
    required: false,
    example: new Date(),
    type: Date,
  })
  @ApiQuery({
    name: 'showAnalyzedOnly',
    required: false,
    type: String,
    enum: ['true', 'false', ''],
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    type: String,
    isArray: true,
  })
  fileNamesForCameraID(
    @Param('cameraID') cameraID: string,
    @Query('dateStart') dateStart?: Date,
    @Query('dateEnd') dateEnd?: Date,
    @Query('showAnalyzedOnly') showAnalyzedOnly?: string,
    @Query('tags') tags?: string[] | string,
  ) {
    return this.timelapseService.getSnapshotFileNames(
      cameraID,
      dateStart,
      dateEnd,
      showAnalyzedOnly,
      tags,
    );
  }

  @Get('timeBoundaries/:cameraID')
  @ApiOperation({
    summary: 'Get oldest and newest dates available for creating timelapse',
  })
  getTimeBoundaries(@Param('cameraID') cameraID: string) {
    return this.timelapseService.getTimelapseBounds(cameraID);
  }
}

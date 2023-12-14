import {
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Header,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SnapshotsService } from './snapshots.service';
import { SnapshotsResponse, SnapshotUrlResponse } from './types';

@Controller('snapshots')
@ApiTags('Snapshots')
export class SnapshotsController {
  constructor(private snapshotsService: SnapshotsService) {}

  @Get()
  @ApiOperation({ summary: 'List all snapshots' })
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
    example: 'timestamp',
    type: String,
    enum: [
      'fileName',
      'id',
      'timezone',
      'fileSize',
      'width',
      'height',
      'timestamp',
      'cameraID',
      'availableCloud',
      'availableLocally',
    ],
  })
  @ApiQuery({
    name: 'sortDirection',
    required: false,
    example: 'desc',
    type: String,
    enum: ['asc', 'desc', ''],
  })
  get(
    @Query('pageSize') pageSize = 40,
    @Query('pageNumber') pageNumber = 0,
    @Query('sortBy', new DefaultValuePipe('timestamp')) sortBy: string,
    @Query('sortDirection', new DefaultValuePipe('desc'))
    sortDirection: 'asc' | 'desc' | '',
    @Query('search') search?: string,
  ) {
    return this.snapshotsService.getSnapshots(
      pageSize,
      pageNumber,
      search,
      sortBy,
      sortDirection,
    );
  }

  @Get('list/:cameraID')
  @ApiOperation({ summary: 'List snapshots for camera' })
  @ApiResponse({
    status: 200,
    description: 'The snapshots for the given camera ID',
    type: SnapshotsResponse,
  })
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
    example: 'timestamp',
    type: String,
    enum: [
      'fileName',
      'id',
      'timezone',
      'fileSize',
      'width',
      'height',
      'timestamp',
      'cameraID',
      'availableCloud',
      'availableLocally',
    ],
  })
  @ApiQuery({
    name: 'sortDirection',
    required: false,
    example: 'desc',
    type: String,
    enum: ['asc', 'desc', ''],
  })
  forCameraID(
    @Param('cameraID') cameraID: string,
    @Query('pageSize') pageSize = 40,
    @Query('pageNumber') pageNumber = 0,
    @Query('sortBy', new DefaultValuePipe('timestamp')) sortBy: string,
    @Query('sortDirection', new DefaultValuePipe('desc'))
    sortDirection: 'asc' | 'desc' | '',
    @Query('search') search?: string,
  ) {
    return this.snapshotsService.getSnapshotsByCameraID(
      cameraID,
      pageSize,
      pageNumber,
      search,
      sortBy,
      sortDirection,
    );
  }

  @Get(':snapshotID')
  @ApiOperation({ summary: 'Get a snapshot' })
  getSnapshot(@Param('snapshotID') snapshotID: string) {
    return this.snapshotsService.getSnapshot(snapshotID);
  }

  @Delete(':snapshotID')
  @ApiOperation({ summary: 'Delete a snapshot' })
  deleteSnapshot(@Param('snapshotID') snapshotID: string) {
    return this.snapshotsService.delete(snapshotID);
  }

  @Get(':snapshotID/url')
  @ApiOperation({ summary: 'Get a signed snapshot image URL' })
  @ApiResponse({
    status: 200,
    description: 'The snapshot URL for the given snapshot ID',
    type: SnapshotUrlResponse,
  })
  getSnapshotDownloadURL(@Param('snapshotID') snapshotID: string) {
    return this.snapshotsService.getSnapshotDownloadURL(snapshotID);
  }

  @Get(':snapshotID/image.jpeg')
  @ApiOperation({ summary: 'Get a snapshot image' })
  @Header('Content-Type', 'image/jpeg')
  getSnapshotImage(@Param('snapshotID') snapshotID: string) {
    return this.snapshotsService.getSnapshotImage(snapshotID);
  }
}

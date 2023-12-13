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
  forCameraID(@Param('cameraID') cameraID: string) {
    return this.snapshotsService.getSnapshotsByCameraID(cameraID);
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

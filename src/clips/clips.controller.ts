import {
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Header,
  Param,
  Query,
} from '@nestjs/common';
import { ClipsService } from './clips.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClipsResponse, ClipUrlResponse } from './type';

@Controller('clips')
@ApiTags('Clips')
export class ClipsController {
  constructor(private clipsService: ClipsService) {}

  @Get()
  @ApiOperation({ summary: 'List all clips' })
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
      'timezone',
      'fileSize',
      'width',
      'height',
      'duration',
      'format',
      'start',
      'end',
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
  getClips(
    @Query('pageSize') pageSize = 40,
    @Query('pageNumber') pageNumber = 0,
    @Query('sortBy', new DefaultValuePipe('end')) sortBy: string,
    @Query('sortDirection', new DefaultValuePipe('desc'))
    sortDirection: 'asc' | 'desc' | '',
    @Query('search') search?: string,
  ) {
    return this.clipsService.getClips(
      pageSize,
      pageNumber,
      search,
      sortBy,
      sortDirection,
    );
  }

  @Get('list/:cameraID')
  @ApiOperation({ summary: 'List clips for camera' })
  @ApiResponse({
    status: 200,
    description: 'The clips for the given camera ID',
    type: ClipsResponse,
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
    example: 'start',
    type: String,
    enum: [
      'fileName',
      'id',
      'timezone',
      'fileSize',
      'width',
      'height',
      'duration',
      'format',
      'start',
      'end',
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
    @Query('sortBy', new DefaultValuePipe('end')) sortBy: string,
    @Query('sortDirection', new DefaultValuePipe('desc'))
    sortDirection: 'asc' | 'desc' | '',
    @Query('search') search?: string,
  ) {
    return this.clipsService.getClipsByCameraID(
      cameraID,
      pageSize,
      pageNumber,
      search,
      sortBy,
      sortDirection,
    );
  }

  @Get(':clipID/video.mp4')
  @ApiOperation({ summary: 'Get a clip video' })
  @Header('Content-Type', 'video/mp4')
  getVideoClip(@Param('clipID') clipID: string) {
    return this.clipsService.getVideoClip(clipID);
  }

  @Get(':clipID/url')
  @ApiOperation({ summary: 'Get a signed URL to download clip from S3' })
  @ApiResponse({
    status: 200,
    description: 'The download URL for the clip from S3',
    type: ClipUrlResponse,
  })
  getVideoDownloadURL(@Param('clipID') clipID: string) {
    return this.clipsService.getClipDownloadURL(clipID);
  }

  @Get(':clipID')
  @ApiOperation({ summary: 'Get a clip' })
  getClip(@Param('clipID') clipID: string) {
    return this.clipsService.getClip(clipID);
  }

  @Delete(':clipID')
  @ApiOperation({ summary: 'Delete a clip' })
  deleteClip(@Param('clipID') clipID: string) {
    return this.clipsService.delete(clipID);
  }
}

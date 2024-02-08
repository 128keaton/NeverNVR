import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ClipsService } from './clips.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  ClipsResponse,
  ClipsUploadRequest,
  ClipUrlResponse,
  ConcatClipCreate,
} from './type';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { AuthGuard } from '@nestjs/passport';

@Controller('clips')
@ApiTags('Clips')
@UseGuards(AuthGuard(['jwt', 'api-key']))
@ApiSecurity('api-key')
@ApiBearerAuth()
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
  @ApiQuery({
    name: 'showAvailableOnly',
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
  getClips(
    @Query('pageSize') pageSize = 40,
    @Query('pageNumber') pageNumber = 0,
    @Query('sortBy', new DefaultValuePipe('end')) sortBy: string,
    @Query('sortDirection', new DefaultValuePipe('desc'))
    sortDirection: 'asc' | 'desc' | '',
    @Query('search') search?: string,
    @Query('dateStart') dateStart?: Date,
    @Query('dateEnd') dateEnd?: Date,
    @Query('gatewayID') gatewayID?: string,
    @Query('showAvailableOnly')
    showAvailableOnly?: string,
    @Query('tags') tags?: string[] | string,
  ) {
    return this.clipsService.getClips(
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
      tags,
    );
  }

  @Get('many')
  @ApiOperation({ summary: 'Get many clips' })
  @ApiQuery({
    name: 'clips',
    required: true,
    isArray: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'The clips for the given camera ID',
    type: ClipsResponse,
  })
  getManyClips(
    @Query('clips', new DefaultValuePipe([])) clips: string | string[],
  ) {
    return this.clipsService.getManyClips(clips);
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
  @ApiQuery({
    name: 'showAvailableOnly',
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
  forCameraID(
    @Param('cameraID') cameraID: string,
    @Query('pageSize') pageSize = 40,
    @Query('pageNumber') pageNumber = 0,
    @Query('sortBy', new DefaultValuePipe('end')) sortBy: string,
    @Query('sortDirection', new DefaultValuePipe('desc'))
    sortDirection: 'asc' | 'desc' | '',
    @Query('search') search?: string,
    @Query('dateStart') dateStart?: Date,
    @Query('dateEnd') dateEnd?: Date,
    @Query('gatewayID') gatewayID?: string,
    @Query('showAvailableOnly')
    showAvailableOnly?: string,
    @Query('tags') tags?: string[] | string,
  ) {
    return this.clipsService.getClips(
      cameraID,
      pageSize,
      pageNumber,
      search,
      sortBy,
      sortDirection,
      dateStart,
      dateEnd,
      gatewayID,
      showAvailableOnly,
      tags,
    );
  }

  @Post('concat')
  @ApiOperation({
    summary: 'Create a clip which is a created from clips given',
  })
  @ApiBody({
    type: ConcatClipCreate,
  })
  createConcatClip(@Body() request: ConcatClipCreate) {
    return this.clipsService.createGeneratedClip(request);
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
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(5000)
  getVideoDownloadURL(@Param('clipID') clipID: string) {
    return this.clipsService.getClipDownloadURL(clipID, false);
  }

  @Get(':clipID/analyzedURL')
  @ApiOperation({ summary: 'Get a signed URL to download clip from S3' })
  @ApiResponse({
    status: 200,
    description: 'The download URL for the clip from S3',
    type: ClipUrlResponse,
  })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(5000)
  async getAnalyzedVideoDownloadURL(@Param('clipID') clipID: string) {
    return this.clipsService.getClipDownloadURL(clipID, true).catch(() => {
      return this.clipsService.getClipDownloadURL(clipID, false);
    });
  }

  @Get(':clipID')
  @ApiOperation({ summary: 'Get a clip' })
  getClip(@Param('clipID') clipID: string) {
    return this.clipsService.getClip(clipID);
  }

  @Get(':clipID/request')
  @ApiOperation({ summary: 'Request a clip' })
  requestClip(@Param('clipID') clipID: string) {
    return this.clipsService.requestClipUpload(clipID);
  }

  @Delete(':clipID')
  @ApiOperation({ summary: 'Delete a clip' })
  deleteClip(@Param('clipID') clipID: string) {
    return this.clipsService.delete(clipID);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Request clips to be uploaded from a gateway' })
  @ApiBody({
    type: ClipsUploadRequest,
  })
  uploadClip(@Body() request: ClipsUploadRequest) {
    return this.clipsService.uploadClips(request.gatewayID, request.clips);
  }
}

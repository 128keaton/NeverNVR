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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { SnapshotsService } from './snapshots.service';
import {
  SnapshotsResponse,
  SnapshotUpload,
  SnapshotUrlResponse,
} from './types';
import { FileInterceptor } from '@nestjs/platform-express';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { AuthGuard } from '@nestjs/passport';

@Controller('snapshots')
@ApiTags('Snapshots')
@UseGuards(AuthGuard(['jwt', 'api-key']))
@ApiSecurity('api-key')
@ApiBearerAuth()
export class SnapshotsController {
  constructor(private snapshotsService: SnapshotsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and create a snapshot' })
  @ApiBody({
    type: SnapshotUpload,
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadAndCreate(
    @Body() request: SnapshotUpload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.snapshotsService.uploadAndCreate(request, file);
  }

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
  get(
    @Query('pageSize') pageSize = 40,
    @Query('pageNumber') pageNumber = 0,
    @Query('sortBy', new DefaultValuePipe('timestamp')) sortBy: string,
    @Query('sortDirection', new DefaultValuePipe('desc'))
    sortDirection: 'asc' | 'desc' | '',
    @Query('search') search?: string,
    @Query('dateStart') dateStart?: Date,
    @Query('dateEnd') dateEnd?: Date,
    @Query('gatewayID') gatewayID?: string,
    @Query('showAnalyzedOnly') showAnalyzedOnly?: string,
    @Query('tags') tags?: string[] | string,
  ) {
    return this.snapshotsService.getSnapshots(
      undefined,
      pageSize,
      pageNumber,
      search,
      sortBy,
      sortDirection,
      dateStart,
      dateEnd,
      gatewayID,
      showAnalyzedOnly,
      tags,
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
  forCameraID(
    @Param('cameraID') cameraID: string,
    @Query('pageSize') pageSize = 40,
    @Query('pageNumber') pageNumber = 0,
    @Query('sortBy', new DefaultValuePipe('timestamp')) sortBy: string,
    @Query('sortDirection', new DefaultValuePipe('desc'))
    sortDirection: 'asc' | 'desc' | '',
    @Query('search') search?: string,
    @Query('dateStart') dateStart?: Date,
    @Query('dateEnd') dateEnd?: Date,
    @Query('gatewayID') gatewayID?: string,
    @Query('showAnalyzedOnly') showAnalyzedOnly?: string,
    @Query('tags') tags?: string[] | string,
  ) {
    return this.snapshotsService.getSnapshots(
      cameraID,
      pageSize,
      pageNumber,
      search,
      sortBy,
      sortDirection,
      dateStart,
      dateEnd,
      gatewayID,
      showAnalyzedOnly,
      tags,
    );
  }

  @Get('fileNames/:cameraID')
  @ApiOperation({ summary: 'List snapshot file names for camera' })
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
    return this.snapshotsService.getSnapshotFileNames(
      cameraID,
      dateStart,
      dateEnd,
      showAnalyzedOnly,
      tags,
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
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(5000)
  getSnapshotDownloadURL(@Param('snapshotID') snapshotID: string) {
    return this.snapshotsService.getSnapshotDownloadURL(snapshotID);
  }

  @Get(':snapshotID/analyzedURL')
  @ApiOperation({ summary: 'Get a signed snapshot image URL' })
  @ApiResponse({
    status: 200,
    description: 'The snapshot URL for the given snapshot ID',
    type: SnapshotUrlResponse,
  })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(5000)
  async getAnalyzedSnapshotDownloadURL(
    @Param('snapshotID') snapshotID: string,
  ) {
    return this.snapshotsService
      .getSnapshotDownloadURL(snapshotID, true)
      .catch(() => {
        return this.snapshotsService.getSnapshotDownloadURL(snapshotID, false);
      });
  }

  @Get(':snapshotID/image.jpeg')
  @ApiOperation({ summary: 'Get a snapshot image' })
  @Header('Content-Type', 'image/jpeg')
  getSnapshotImage(@Param('snapshotID') snapshotID: string) {
    return this.snapshotsService.getSnapshotImage(snapshotID);
  }
}

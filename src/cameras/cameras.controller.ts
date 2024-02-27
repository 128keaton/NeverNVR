import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CamerasService } from './cameras.service';
import {
  Camera,
  CameraCreate,
  CameraUpdate,
  CamerasResponse,
  CameraSnapshotsResponse,
} from './types';
import { Camera as CameraEntity } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { CamerasISAPIService } from './cameras-isapi.service';

@Controller('cameras')
@ApiTags('Cameras')
@UseGuards(AuthGuard(['jwt', 'api-key']))
@ApiSecurity('api-key')
@ApiBearerAuth()
export class CamerasController {
  constructor(
    private camerasService: CamerasService,
    private camerasISAPIService: CamerasISAPIService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a camera' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 200,
    description: 'The created record',
    type: Camera,
  })
  create(@Body() data: CameraCreate): Promise<CameraEntity> {
    return this.camerasService.create(data);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'The found record',
    type: Camera,
  })
  @ApiOperation({ summary: 'Get a camera' })
  get(@Param('id') id: string): Promise<CameraEntity> {
    return this.camerasService.get(id);
  }

  @Get(':id/details')
  @ApiResponse({
    status: 200,
    description: 'The found record',
    type: Camera,
  })
  @ApiOperation({ summary: 'Get a cameras details' })
  @CacheTTL(1000)
  @UseInterceptors(CacheInterceptor)
  getDetails(@Param('id') id: string): Promise<Camera> {
    return this.camerasService.getDetails(id);
  }

  @Get(':id/isapi/streamSettings/:channelID')
  @ApiResponse({
    status: 200,
  })
  @ApiParam({
    name: 'id',
    description: 'Camera ID',
  })
  @ApiParam({
    name: 'channelID',
    description: 'Channel ID',
    example: 101,
  })
  @ApiOperation({ summary: '(HikVision) Get camera stream settings' })
  async getISAPIStreamSettings(
    @Param('id') id: string,
    @Param('channelID') channelID: number,
  ) {
    return this.camerasISAPIService.getCameraStreamSettings(id, channelID);
  }

  @Put(':id/isapi/streamSettings/:channelID')
  @ApiResponse({
    status: 200,
  })
  @ApiParam({
    name: 'id',
    description: 'Camera ID',
  })
  @ApiParam({
    name: 'channelID',
    description: 'Channel ID',
    example: 101,
  })
  @ApiOperation({ summary: '(HikVision) Update camera stream settings' })
  async updateISAPIStreamSettings(
    @Param('id') id: string,
    @Param('channelID') channelID: number,
    @Body() update: any,
  ) {
    return this.camerasISAPIService.updateCameraStreamSettings(
      id,
      update,
      channelID,
    );
  }

  @Get(':id/preview.jpeg')
  @ApiOperation({
    summary: 'Get a cameras preview image based off the last snapshot',
  })
  @Header('Content-Type', 'image/jpeg')
  @CacheTTL(15000)
  @UseInterceptors(CacheInterceptor)
  async getPreview(@Param('id') id: string) {
    return this.camerasService.getStalePreview(id);
  }

  @Get(':id/live-preview.jpeg')
  @ApiOperation({
    summary:
      'Get a cameras preview image, takes a while since its directly from the camera',
  })
  @Header('Content-Type', 'image/jpeg')
  @CacheTTL(15000)
  @UseInterceptors(CacheInterceptor)
  async getLivePreview(@Param('id') id: string, @Res() res: Response) {
    const response = await this.camerasService.getLivePreview(id);
    response.data.pipe(res);
  }

  @Get(':id/snapshots')
  @ApiResponse({
    status: 200,
    description: 'The list of snapshot IDs',
    type: CameraSnapshotsResponse,
  })
  @ApiOperation({ summary: 'Get a cameras details' })
  getSnapshots(@Param('id') id: string): Promise<CameraSnapshotsResponse> {
    return this.camerasService.getSnapshots(id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get a cameras logs' })
  getLogs(@Param('id') id: string) {
    return this.camerasService.getLogOutput(id);
  }

  @Get(':id/restart/recording')
  @ApiOperation({ summary: 'Restart camera recording process' })
  async restartRecording(@Param('id') id: string) {
    return this.camerasService.restartRecording(id);
  }

  @Get(':id/restart/streaming')
  @ApiOperation({ summary: 'Restart camera streaming process' })
  async restartStreaming(@Param('id') id: string) {
    return this.camerasService.restartStreaming(id);
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
  })
  @ApiQuery({
    name: 'sortDirection',
    required: false,
    example: 'desc',
    type: String,
    enum: ['asc', 'desc', ''],
  })
  @ApiQuery({
    name: 'gatewayID',
    required: false,
    type: String,
  })
  @ApiOperation({ summary: 'Get all cameras' })
  @ApiResponse({
    status: 200,
    description: 'The found records',
    type: CamerasResponse,
  })
  getMany(
    @Query('pageSize') pageSize = 40,
    @Query('pageNumber') pageNumber = 0,
    @Query('sortBy', new DefaultValuePipe('name')) sortBy: string,
    @Query('sortDirection', new DefaultValuePipe('desc'))
    sortDirection: 'asc' | 'desc' | '',
    @Query('search') search?: string,
    @Query('gatewayID') gatewayID?: string,
  ) {
    return this.camerasService.getMany(
      pageSize,
      pageNumber,
      search,
      sortBy,
      sortDirection,
      gatewayID,
    );
  }

  @Delete(':id')
  @ApiResponse({
    status: 200,
    description: 'The deleted record',
    type: Camera,
  })
  @ApiOperation({ summary: 'Delete a camera' })
  async delete(@Param('id') id: string): Promise<Camera> {
    return this.camerasService.delete(id);
  }

  @Patch(':id')
  @ApiResponse({
    status: 200,
    description: 'The updated record',
    type: Camera,
  })
  @ApiOperation({ summary: 'Update a camera' })
  update(
    @Param('id') id: string,
    @Body() data: CameraUpdate,
  ): Promise<CameraEntity> {
    return this.camerasService.update(id, data);
  }
}

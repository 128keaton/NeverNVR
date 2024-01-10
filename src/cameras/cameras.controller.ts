import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
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

@Controller('cameras')
@ApiTags('Cameras')
@UseGuards(AuthGuard(['jwt', 'api-key']))
@ApiSecurity('api-key')
@ApiBearerAuth()
export class CamerasController {
  constructor(private camerasService: CamerasService) {}

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
  getDetails(@Param('id') id: string): Promise<Camera> {
    return this.camerasService.getDetails(id);
  }

  @Get(':id/preview.jpeg')
  @ApiOperation({ summary: 'Get a cameras preview image' })
  @Header('Content-Type', 'image/jpeg')
  getPreview(@Param('id') id: string) {
    return this.camerasService.getPreview(id);
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
  getMany(@Query('gatewayID') gatewayID?: string) {
    return this.camerasService.getMany({
      gatewayID,
    });
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

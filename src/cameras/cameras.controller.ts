import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CamerasService } from './cameras.service';
import { Camera, CameraCreate, CameraUpdate, CamerasResponse } from './types';
import { Camera as CameraEntity } from '@prisma/client';

@Controller('cameras')
@ApiTags('Cameras')
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

  @Get()
  @ApiOperation({ summary: 'Get all cameras' })
  @ApiResponse({
    status: 200,
    description: 'The found records',
    type: CamerasResponse,
  })
  getMany() {
    return this.camerasService.getMany();
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

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
import { CameraProperties } from './types';

@Controller('cameras')
export class CamerasController {
  constructor(private camerasService: CamerasService) {}

  @Post()
  create(@Body() request: CameraProperties) {
    return this.camerasService.create(request);
  }

  @Get(':cameraID')
  get(@Param('cameraID') cameraID: string) {
    return this.camerasService.camera(cameraID);
  }

  @Delete(':cameraID')
  delete(@Param('cameraID') cameraID: string) {
    return this.camerasService.delete(cameraID);
  }

  @Get(':cameraID/active')
  checkActive(@Param('cameraID') cameraID: string) {
    return this.camerasService.checkActive(cameraID);
  }

  @Patch(':cameraID')
  update(
    @Param('cameraID') cameraID: string,
    @Body() request: CameraProperties,
  ) {
    return this.camerasService.update(cameraID, request);
  }
}

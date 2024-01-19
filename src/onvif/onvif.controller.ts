import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OnvifService } from './onvif.service';
import { MoveRequest, PresetRequest, ZoomRequest } from './requests';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  DeviceInformationResponse,
  ONVIFStatusResponse,
  PTZPresetsResponse,
  PTZResponse,
} from './responses';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@Controller('onvif')
@ApiTags('ONVIF')
@UseGuards(AuthGuard(['jwt', 'api-key']))
@ApiSecurity('api-key')
@ApiBearerAuth()
export class OnvifController {
  constructor(private onvifService: OnvifService) {}

  @Get(':cameraID/info')
  @ApiResponse({
    status: 200,
    type: DeviceInformationResponse,
  })
  @CacheTTL(5000)
  @UseInterceptors(CacheInterceptor)
  getDeviceInfo(@Param('cameraID') cameraID: string) {
    return this.onvifService.getDeviceInformation(cameraID);
  }

  @Get(':cameraID/presets')
  @ApiResponse({
    status: 200,
    type: PTZPresetsResponse,
  })
  @CacheTTL(15000)
  @UseInterceptors(CacheInterceptor)
  getPresets(@Param('cameraID') cameraID: string) {
    return this.onvifService.getPresets(cameraID);
  }

  @Get(':cameraID/onvifStatus')
  @ApiResponse({
    status: 200,
    type: ONVIFStatusResponse,
  })
  @CacheTTL(15000)
  @UseInterceptors(CacheInterceptor)
  checkForONVIF(@Param('cameraID') cameraID: string) {
    return this.onvifService.getONVIFStatus(cameraID);
  }

  @Post(':cameraID/zoom')
  @ApiResponse({
    status: 200,
    type: PTZResponse,
  })
  zoom(@Param('cameraID') cameraID: string, @Body() request: ZoomRequest) {
    return this.onvifService.zoom(cameraID, request.amount);
  }

  @Post(':cameraID/move')
  @ApiResponse({
    status: 200,
    type: PTZResponse,
  })
  move(@Param('cameraID') cameraID: string, @Body() request: MoveRequest) {
    return this.onvifService.move(cameraID, request.directions, request.amount);
  }

  @Post(':cameraID/preset')
  @ApiResponse({
    status: 200,
    type: PTZResponse,
  })
  async goToPreset(
    @Param('cameraID') cameraID: string,
    @Body() request: PresetRequest,
  ) {
    return await this.onvifService.goToPreset(cameraID, request.preset);
  }
}

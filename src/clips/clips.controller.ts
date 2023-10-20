import { Controller, Get, Header, Param } from '@nestjs/common';
import { ClipsService } from './clips.service';

@Controller('clips')
export class ClipsController {
  constructor(private clipsService: ClipsService) {}

  @Get('list/:cameraID')
  forCameraID(@Param('cameraID') cameraID: string) {
    return this.clipsService.getClipsByCameraID(cameraID);
  }

  @Get(':clipID.mp4')
  @Header('Content-Type', 'video/mp4')
  getClip(@Param('clipID') clipID: string) {
    return this.clipsService.getVideoClip(clipID);
  }
}

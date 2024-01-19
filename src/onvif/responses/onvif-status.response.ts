import { ApiProperty } from '@nestjs/swagger';

export class ONVIFStatusResponse {
  @ApiProperty()
  onvif: boolean;

  @ApiProperty({
    required: false,
  })
  reason?: string;

  @ApiProperty()
  canZoom: boolean;

  @ApiProperty()
  canPanTilt: boolean;
}

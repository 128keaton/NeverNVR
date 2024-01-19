import { PTZConfiguration } from '../types';
import { ApiProperty } from '@nestjs/swagger';

export class DeviceInformationResponse {
  @ApiProperty({
    type: Date,
  })
  date: Date;

  @ApiProperty()
  hostname: string;

  @ApiProperty({
    type: PTZConfiguration,
    isArray: true,
  })
  ptzConfigurations: PTZConfiguration[];

  @ApiProperty()
  canZoom: boolean;

  @ApiProperty()
  canPanTilt: boolean;
}

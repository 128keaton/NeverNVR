import { PTZPreset } from '../types';
import { ApiProperty } from '@nestjs/swagger';

export class PTZPresetsResponse {
  @ApiProperty({
    type: PTZPreset,
    isArray: true,
  })
  presets: PTZPreset[];
}

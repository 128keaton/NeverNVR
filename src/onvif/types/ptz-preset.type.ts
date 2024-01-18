import { PTZVector } from './ptz-vector.type';
import { ApiProperty } from '@nestjs/swagger';

export class PTZPreset {
  @ApiProperty()
  token: string;

  @ApiProperty({
    required: false,
  })
  name?: string;

  @ApiProperty({
    type: PTZVector,
  })
  PTZPosition?: PTZVector;
}

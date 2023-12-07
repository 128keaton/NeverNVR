import { Camera } from './camera.type';
import { ApiProperty } from '@nestjs/swagger';

export class CamerasResponse {
  @ApiProperty({
    type: Number,
  })
  total: number;

  @ApiProperty({
    type: Camera,
    isArray: true,
  })
  data: Camera[];
}

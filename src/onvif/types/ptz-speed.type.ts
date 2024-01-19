import { ApiProperty } from '@nestjs/swagger';
import { Vector2D } from './vector-2d.type';
import { Vector1D } from './vector-1d.type';

export class PTZSpeed {
  @ApiProperty({
    type: Vector2D,
  })
  panTilt?: Vector2D;

  @ApiProperty({
    type: Vector1D,
  })
  zoom?: Vector1D;
}

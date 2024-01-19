import { ApiProperty } from '@nestjs/swagger';
import { Vector1D } from './vector-1d.type';

export class Vector2D extends Vector1D {
  @ApiProperty()
  y: number;
}

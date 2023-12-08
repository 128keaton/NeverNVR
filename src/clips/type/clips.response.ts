import { ApiProperty } from '@nestjs/swagger';
import { Clip } from './clip.type';

export class ClipsResponse {
  @ApiProperty({
    type: Number,
  })
  total: number;

  @ApiProperty({
    type: Clip,
    isArray: true,
  })
  data: Clip[];
}

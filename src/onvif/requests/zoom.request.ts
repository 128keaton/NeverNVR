import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class ZoomRequest {
  @ApiProperty({
    example: -0.001,
    description: 'Max zoom is 1',
  })
  @IsNumber()
  amount: number;
}

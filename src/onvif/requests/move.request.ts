import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional } from 'class-validator';
import { PTZMoveDirection } from '../enums';

export class MoveRequest {
  @ApiProperty({
    example: -0.001,
    description: 'Max amount is 1',
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    type: PTZMoveDirection,
    enum: [
      PTZMoveDirection.UP,
      PTZMoveDirection.DOWN,
      PTZMoveDirection.LEFT,
      PTZMoveDirection.RIGHT,
    ],
    isArray: true,
  })
  @IsArray()
  directions: PTZMoveDirection[];

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  speed?: number;
}

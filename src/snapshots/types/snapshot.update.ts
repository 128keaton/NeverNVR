import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class SnapshotUpdate {
  @ApiProperty({
    example: 'UTC',
    required: false,
  })
  @IsOptional()
  timezone?: string;

  @ApiProperty({
    example: 'snapshot.jpeg',
    required: false,
  })
  @IsOptional()
  fileName?: string;

  @ApiProperty({
    example: 1238,
    required: false,
  })
  @IsOptional()
  fileSize?: number;

  @ApiProperty({
    example: 1920,
    required: false,
  })
  @IsOptional()
  width?: number;

  @ApiProperty({
    example: 1080,
    required: false,
  })
  @IsOptional()
  height?: number;

  @ApiProperty({
    type: Date,
    required: false,
  })
  @IsOptional()
  timestamp?: Date;

  @ApiProperty({
    example: 25,
    required: false,
  })
  @IsOptional()
  deleteAfter?: number;
}

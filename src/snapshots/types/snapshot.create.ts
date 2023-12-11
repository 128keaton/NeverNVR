import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator';

export class SnapshotCreate {
  @ApiProperty({
    example: 'kajsdlkjaskld',
    description: 'ID of the gateway',
    required: true,
  })
  @IsString()
  gatewayID: string;

  @ApiProperty({
    example: 'UTC',
    required: true,
  })
  @IsString()
  timezone: string;

  @ApiProperty({
    example: 'snapshot.jpg',
    required: true,
  })
  @IsString()
  id: string;

  @ApiProperty({
    example: 'camera-2',
    required: true,
  })
  @IsString()
  cameraName: string;

  @ApiProperty({
    example: 'snapshot.jpeg',
    required: true,
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    example: 1238,
    required: true,
  })
  @IsNumber()
  fileSize: number;

  @ApiProperty({
    example: 1920,
    required: true,
  })
  @IsNumber()
  width: number;

  @ApiProperty({
    example: 1080,
    required: true,
  })
  @IsNumber()
  height: number;

  @ApiProperty({
    type: Date,
    required: true,
  })
  @IsDate()
  timestamp: Date;

  @ApiProperty({
    example: true,
  })
  availableLocally?: boolean;

  @ApiProperty({
    example: true,
  })
  availableCloud?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CameraUpdate {
  @ApiProperty({
    required: false,
    example: 'camera-2',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    required: false,
    description: 'Everything after the IP address',
    example: '/ISAPI/Streaming/Channels/101/picture',
  })
  @IsString()
  @IsOptional()
  snapshotURL?: string;

  @ApiProperty({
    description: 'Everything after the IP address',
    example: '/Streaming/Channels/102/',
    required: false,
  })
  @IsOptional()
  subStreamURL?: string;

  @ApiProperty({
    required: false,
    description: 'Everything after the IP address',
    example: '/Streaming/Channels/101/',
  })
  @IsString()
  @IsOptional()
  streamURL?: string;

  @ApiProperty({
    required: false,
    default: 30,
    example: 30,
    description: 'Clips split every X seconds',
  })
  @IsNumber()
  @IsOptional()
  splitEvery?: number;

  @ApiProperty({
    required: false,
    default: 60,
    example: 60,
    description: 'Take a snapshot every X seconds',
  })
  @IsNumber()
  @IsOptional()
  snapshotInterval?: number;

  @ApiProperty({
    example: 5123,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  rtpPort?: number;

  @ApiProperty({
    example: '10.1.5.70',
    required: false,
  })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiProperty({
    example: 'admin',
    required: false,
  })
  @IsString()
  @IsOptional()
  rtspUsername?: string;

  @ApiProperty({
    required: false,
  })
  @IsString()
  @IsOptional()
  rtspPassword?: string;

  @ApiProperty({
    required: false,
    default: true,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  stream?: boolean;

  @ApiProperty({
    required: false,
    default: true,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  record?: boolean;

  @ApiProperty({
    required: false,
    default: 'UTC',
    example: 'UTC',
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({
    example: 72,
    default: 72,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  deleteClipAfter?: number;

  @ApiProperty({
    example: 72,
    default: 72,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  deleteSnapshotAfter?: number;

  @ApiProperty({
    example: 'admin',
    required: false,
  })
  @IsOptional()
  onvifUsername?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  onvifPassword?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  port?: number;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  online?: boolean;
}

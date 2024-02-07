import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { CameraType, HardwareEncoderPriority } from '@prisma/client';

export class CameraCreate {
  @ApiProperty({
    required: true,
    example: 'camera-2',
  })
  @IsString()
  name: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  id?: string;

  @ApiProperty({
    required: true,
    example: '21kaskjdhjkha',
  })
  @IsString()
  gatewayID: string;

  @ApiProperty({
    description: 'Everything after the IP address',
    example: '/ISAPI/Streaming/Channels/101/picture',
  })
  @IsString()
  snapshotURL: string;

  @ApiProperty({
    description: 'Everything after the IP address',
    example: '/Streaming/Channels/101/',
  })
  @IsString()
  streamURL: string;

  @ApiProperty({
    description: 'Everything after the IP address',
    example: '/Streaming/Channels/102/',
    required: false,
  })
  @IsOptional()
  subStreamURL?: string;

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
    required: false,
  })
  @IsOptional()
  port?: number;

  @ApiProperty({
    example: '10.1.5.70',
  })
  @IsString()
  ipAddress: string;

  @ApiProperty({
    example: 'admin',
  })
  @IsString()
  rtspUsername: string;

  @ApiProperty({
    example: 'admin',
    required: false,
  })
  @IsOptional()
  onvifUsername?: string;

  @ApiProperty()
  @IsString()
  rtspPassword: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  onvifPassword?: string;

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
  })
  @IsOptional()
  manufacturer?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  type?: CameraType;

  @ApiProperty({
    enum: [
      HardwareEncoderPriority.none,
      HardwareEncoderPriority.nvidia,
      HardwareEncoderPriority.vaapi,
      HardwareEncoderPriority.u30,
    ],
    default: HardwareEncoderPriority.none,
    example: HardwareEncoderPriority.none,
  })
  @IsOptional()
  hardwareEncoderPriority?: HardwareEncoderPriority;
}

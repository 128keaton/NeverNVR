import { ApiProperty } from '@nestjs/swagger';
import { ConnectionStatus } from '@prisma/client';

export class Camera {
  @ApiProperty({
    example: 'asd102390sod',
  })
  id: string;

  @ApiProperty({
    example: 'asd102390sod',
  })
  name: string;

  @ApiProperty({
    description: 'Everything after the IP address',
    example: '/ISAPI/Streaming/Channels/101/picture',
  })
  snapshotURL: string;

  @ApiProperty({
    description: 'Everything after the IP address',
    example: '/Streaming/Channels/101/',
  })
  streamURL: string;

  @ApiProperty({
    description: 'Everything after the IP address',
    example: '/Streaming/Channels/102/',
    required: false,
  })
  subStreamURL?: string;

  @ApiProperty({
    default: 30,
    example: 30,
    description: 'Clips split every X seconds',
  })
  splitEvery: number;

  @ApiProperty({
    required: false,
    default: 60,
    example: 60,
    description: 'Take a snapshot every X seconds',
  })
  snapshotInterval?: number;

  @ApiProperty({
    example: '10.1.5.70',
  })
  ipAddress: string;

  @ApiProperty({
    example: 'admin',
  })
  rtspUsername: string;

  @ApiProperty()
  rtspPassword: string;

  @ApiProperty({
    default: true,
    example: true,
  })
  stream: boolean;

  @ApiProperty({
    default: true,
    example: true,
  })
  record: boolean;

  @ApiProperty({
    example: 'admin',
    required: false,
  })
  onvifUsername?: string;

  @ApiProperty({
    required: false,
  })
  onvifPassword?: string;

  @ApiProperty({
    required: false,
  })
  port?: number;

  @ApiProperty()
  status: ConnectionStatus;

  @ApiProperty()
  lastConnection?: Date;

  @ApiProperty()
  gatewayID: string;

  @ApiProperty()
  synchronized: boolean;
}

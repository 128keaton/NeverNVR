import { ApiProperty } from '@nestjs/swagger';
import { ConnectionStatus } from '@prisma/client';

export class Gateway {
  @ApiProperty({
    example: 'a2sda2s9d8214k-1',
  })
  id: string;

  @ApiProperty({
    example: 'gateway-1',
  })
  name: string;

  @ApiProperty({
    example: 'UTC',
  })
  timezone: string;

  @ApiProperty({
    example: 'https://test.ccprxy.com',
  })
  connectionURL: string;

  @ApiProperty({
    example: '123123123',
  })
  connectionToken: string;

  @ApiProperty({
    example: ConnectionStatus.CONNECTED,
    enum: [
      ConnectionStatus.CONNECTED,
      ConnectionStatus.DISCONNECTED,
      ConnectionStatus.UNKNOWN,
    ],
  })
  status: string;

  @ApiProperty({
    type: Date,
  })
  lastConnection?: Date;
}

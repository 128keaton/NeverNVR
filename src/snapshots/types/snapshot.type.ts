import { ApiProperty } from '@nestjs/swagger';

export class Snapshot {
  @ApiProperty({
    example: 'kajsdlkjaskld',
    description: 'ID of snapshot',
  })
  id: string;

  @ApiProperty({
    example: 'kajsdlkjaskld',
    description: 'ID of the gateway',
  })
  gatewayID: string;

  @ApiProperty({
    example: 'UTC',
  })
  timezone: string;

  @ApiProperty({
    example: 'snapshot.jpeg',
  })
  fileName: string;

  @ApiProperty({
    example: 1238,
  })
  fileSize: number;

  @ApiProperty({
    example: 1920,
  })
  width: number;

  @ApiProperty({
    example: 1080,
  })
  height: number;

  @ApiProperty({
    type: Date,
  })
  timestamp: Date;

  @ApiProperty({
    example: 25,
  })
  deleteAfter: number;
}

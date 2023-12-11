import { ApiProperty } from '@nestjs/swagger';

export class GatewayDiskSpace {
  @ApiProperty()
  diskPath: string;

  @ApiProperty()
  free: number;

  @ApiProperty()
  size: number;
}

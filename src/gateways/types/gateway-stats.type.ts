import { ApiProperty } from '@nestjs/swagger';

export class GatewayStats {
  @ApiProperty()
  cameras: number;

  @ApiProperty()
  clips: number;

  @ApiProperty()
  snapshots: number;
}

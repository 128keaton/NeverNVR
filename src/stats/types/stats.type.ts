import { ApiProperty } from '@nestjs/swagger';

export class Stats {
  @ApiProperty()
  cameras: number;

  @ApiProperty()
  clips: number;

  @ApiProperty()
  snapshots: number;
}

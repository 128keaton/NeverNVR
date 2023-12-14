import { ApiProperty } from '@nestjs/swagger';

export class SizeStat {
  @ApiProperty()
  size: number;

  @ApiProperty()
  units: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  gateway: string;
}

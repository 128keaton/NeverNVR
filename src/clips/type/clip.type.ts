import { ApiProperty } from '@nestjs/swagger';

export class Clip {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  fileSize: number;

  @ApiProperty()
  width: number;

  @ApiProperty()
  height: number;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  format?: 'h265' | 'h264';

  @ApiProperty()
  start: Date;

  @ApiProperty()
  end?: Date;

  @ApiProperty()
  availableLocally: boolean;

  @ApiProperty()
  availableCloud: boolean;

  @ApiProperty()
  gatewayID: string;
}
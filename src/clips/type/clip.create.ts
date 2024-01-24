import { ApiProperty } from '@nestjs/swagger';

export class ClipCreate {
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

  @ApiProperty()
  analyticsJobID?: string;

  @ApiProperty()
  analyzedFileName?: string;

  @ApiProperty()
  analyzed: boolean;

  @ApiProperty()
  primaryTag?: string;

  @ApiProperty()
  tags: string[];

  @ApiProperty()
  requested?: boolean;
}

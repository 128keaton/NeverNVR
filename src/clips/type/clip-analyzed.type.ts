import { ApiProperty } from '@nestjs/swagger';

export class ClipAnalyzed {
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
}

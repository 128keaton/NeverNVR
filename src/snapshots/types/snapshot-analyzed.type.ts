import { ApiProperty } from '@nestjs/swagger';

export class SnapshotAnalyzed {
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

import { ClipFormat } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ClipUpdate {
  @ApiProperty()
  fileName?: string;

  @ApiProperty()
  fileSize?: number;

  @ApiProperty()
  width?: number;

  @ApiProperty()
  height?: number;

  @ApiProperty()
  duration?: number;

  @ApiProperty()
  format?: ClipFormat;

  @ApiProperty()
  start?: Date;

  @ApiProperty()
  end?: Date;

  @ApiProperty()
  processing?: boolean;

  @ApiProperty()
  availableLocally?: boolean;

  @ApiProperty()
  availableCloud?: boolean;

  @ApiProperty()
  analyticsJobID?: string;

  @ApiProperty()
  analyzedFileName?: string;

  @ApiProperty()
  analyzed?: boolean;

  @ApiProperty()
  analyzing?: boolean;

  @ApiProperty()
  analyzeStart?: Date;

  @ApiProperty()
  analyzeEnd?: Date;

  @ApiProperty()
  primaryTag?: string;

  @ApiProperty()
  tags?: string[];

  @ApiProperty()
  generated?: boolean;

  @ApiProperty()
  generateStart?: Date;

  @ApiProperty()
  generateEnd?: Date;

  @ApiProperty()
  generationJobID?: string;

  @ApiProperty()
  requested?: boolean;
}

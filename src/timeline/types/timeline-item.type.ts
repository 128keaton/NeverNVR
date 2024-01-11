import { ApiProperty } from '@nestjs/swagger';

export class TimelineItem {
  @ApiProperty({
    type: Date,
  })
  start: Date;

  @ApiProperty({
    type: Date,
  })
  end: Date;

  @ApiProperty({
    required: false,
  })
  snapshotURL?: string;

  @ApiProperty({
    required: false,
  })
  clipURL?: string;

  @ApiProperty({
    required: false,
  })
  primaryTag?: string;

  @ApiProperty({
    required: false,
  })
  tags?: string[];

  constructor(start: Date, end: Date) {
    this.start = start;
    this.end = end;
  }
}

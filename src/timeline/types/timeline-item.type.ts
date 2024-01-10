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

  constructor(start: Date, end: Date) {
    this.start = start;
    this.end = end;
  }
}

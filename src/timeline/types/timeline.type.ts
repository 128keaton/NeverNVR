import { TimelineItem } from './timeline-item.type';
import { ApiProperty } from '@nestjs/swagger';

export class Timeline {
  @ApiProperty({
    type: TimelineItem,
    isArray: true,
  })
  items: TimelineItem[];

  @ApiProperty()
  cameraID: string;

  @ApiProperty({
    type: Date,
  })
  start: Date;

  @ApiProperty({
    type: Date,
  })
  end: Date;
}

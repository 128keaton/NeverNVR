import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class TimelineRequest {
  @ApiProperty({
    isArray: true,
  })
  @IsArray()
  clipIDs: string[];

  @ApiProperty({
    isArray: true,
  })
  @IsArray()
  snapshotIDs: string[];
}

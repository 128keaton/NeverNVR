import { ApiProperty } from '@nestjs/swagger';

export class SnapshotUrlResponse {
  @ApiProperty()
  url: string;
}

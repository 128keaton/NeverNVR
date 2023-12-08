import { ApiProperty } from '@nestjs/swagger';
import { Snapshot } from './snapshot.type';

export class SnapshotsResponse {
  @ApiProperty()
  total: number;

  @ApiProperty({
    type: Snapshot,
    isArray: true,
  })
  data: Snapshot;
}

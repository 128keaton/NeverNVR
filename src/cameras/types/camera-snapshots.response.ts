import { CameraSnapshot } from './camera-snapshot.type';
import { ApiProperty } from '@nestjs/swagger';

export class CameraSnapshotsResponse {
  @ApiProperty()
  total: number;

  @ApiProperty({
    type: CameraSnapshot,
    isArray: true,
  })
  snapshots: CameraSnapshot[];
}

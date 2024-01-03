import { ApiProperty } from '@nestjs/swagger';

export class CameraSnapshot {
  @ApiProperty()
  snapshotID: string;

  @ApiProperty()
  cameraID: string;

  @ApiProperty()
  timestamp: Date;
}

import { ApiProperty } from '@nestjs/swagger';

export class ClipsRequest {
  @ApiProperty()
  startDate?: Date;

  @ApiProperty()
  endDate?: Date;

  @ApiProperty()
  cameraID?: string;

  @ApiProperty()
  gatewayID: string;
}

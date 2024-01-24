import { ApiProperty } from '@nestjs/swagger';

export class ClipsUploadRequest {
  @ApiProperty({
    type: String,
    isArray: true,
  })
  clips: string[];

  @ApiProperty()
  gatewayID: string;
}

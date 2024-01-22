import { ApiProperty } from '@nestjs/swagger';

export class ConcatClipCreate {
  @ApiProperty({
    isArray: true,
    type: String,
  })
  clipIDs: string[];

  @ApiProperty()
  cameraID: string;
}

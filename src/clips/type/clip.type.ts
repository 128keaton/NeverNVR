import { ApiProperty } from '@nestjs/swagger';
import { ClipCreate } from './clip.create';

export class Clip extends ClipCreate {
  @ApiProperty()
  camera: {
    id: string;
  };

  @ApiProperty()
  gateway: {
    s3Bucket: string;
  };

  @ApiProperty()
  url?: string;
}

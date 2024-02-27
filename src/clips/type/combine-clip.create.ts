import { ApiProperty } from '@nestjs/swagger';

export class CombineClipCreate {
  @ApiProperty({
    isArray: true,
    type: String,
  })
  clipIDs: string[];
}

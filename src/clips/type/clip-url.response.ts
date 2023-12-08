import { ApiProperty } from '@nestjs/swagger';

export class ClipUrlResponse {
  @ApiProperty()
  url: string;
}

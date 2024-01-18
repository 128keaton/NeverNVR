import { ApiProperty } from '@nestjs/swagger';

export class PTZResponse {
  @ApiProperty()
  success: boolean;
}

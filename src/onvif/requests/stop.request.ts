import { ApiProperty } from '@nestjs/swagger';

export class StopRequest {
  @ApiProperty({
    required: false,
  })
  panTilt?: boolean;

  @ApiProperty({
    required: false,
  })
  zoom?: boolean;
}

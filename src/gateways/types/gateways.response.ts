import { ApiProperty } from '@nestjs/swagger';
import { Gateway } from './gateway.type';

export class GatewaysResponse {
  @ApiProperty({
    type: Number,
  })
  total: number;

  @ApiProperty({
    type: Gateway,
    isArray: true,
  })
  data: Gateway[];
}

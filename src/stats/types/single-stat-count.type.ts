import { ApiProperty } from '@nestjs/swagger';

export class SingleStatCount {
  @ApiProperty()
  count: number;

  @ApiProperty({
    enum: ['cameras', 'clips', 'snapshots', 'gateways'],
  })
  type: 'cameras' | 'clips' | 'snapshots' | 'gateways';
}

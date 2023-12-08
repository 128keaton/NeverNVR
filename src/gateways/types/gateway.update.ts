import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class GatewayUpdate {
  @ApiProperty({
    required: false,
    example: 'gateway-1',
  })
  @IsOptional()
  name?: string;

  @ApiProperty({
    required: false,
    example: 'UTC',
  })
  @IsOptional()
  timezone?: string;

  @ApiProperty({
    required: false,
    example: 'https://test.ccprxy.com',
  })
  @IsOptional()
  connectionURL?: string;

  @ApiProperty({
    required: false,
    example: '123123123',
  })
  @IsOptional()
  connectionToken?: string;

  @ApiProperty({
    required: false,
    example: 'pod1-nvr',
  })
  @IsOptional()
  s3Bucket?: string;
}

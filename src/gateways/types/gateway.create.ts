import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GatewayCreate {
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
    required: true,
    example: 'https://test.ccprxy.com',
  })
  @IsString()
  connectionURL: string;

  @ApiProperty({
    required: true,
    example: '123123123',
  })
  @IsString()
  connectionToken: string;

  @ApiProperty({
    required: true,
    example: 'pod1-nvr',
  })
  @IsString()
  s3Bucket: string;
}

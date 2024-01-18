import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PresetRequest {
  @ApiProperty()
  @IsString()
  preset: string;
}

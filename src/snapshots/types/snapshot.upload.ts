import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SnapshotUpload {
  @ApiProperty({
    example: 'kajsdlkjaskld',
    description: 'ID of the gateway',
    required: true,
  })
  @IsString()
  gatewayID: string;

  @ApiProperty({
    example: 'UTC',
    required: false,
  })
  timezone?: string;

  @ApiProperty({
    example: '12bd2dba-94c1-457b-b6ff-68f48831adf4',
    required: true,
  })
  @IsString()
  cameraID: string;

  @ApiProperty({
    example: '1238',
    required: true,
  })
  @IsString()
  fileSize: string;

  @ApiProperty({
    example: '1280',
    required: true,
  })
  @IsString()
  width: string;

  @ApiProperty({
    example: '720',
    required: true,
  })
  @IsString()
  height: string;

  @ApiProperty({
    type: String,
    required: true,
    description: 'ISO time string',
  })
  @IsString()
  timestamp: string;

  @ApiProperty({
    type: String,
    format: 'binary',
    required: true,
  })
  file: Express.Multer.File;
}

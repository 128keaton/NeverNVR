import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

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
    example: 1238,
    required: true,
  })
  @IsNumber()
  fileSize: number;

  @ApiProperty({
    example: 1920,
    required: true,
  })
  @IsNumber()
  width: number;

  @ApiProperty({
    example: 1080,
    required: true,
  })
  @IsNumber()
  height: number;

  @ApiProperty({
    type: Date,
    required: false,
  })
  timestamp?: Date;

  @ApiProperty({
    type: String,
    format: 'binary',
    required: true,
  })
  file: Express.Multer.File;
}

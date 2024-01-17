import { ApiProperty } from "@nestjs/swagger";

export class TimelapseCreate {

  @ApiProperty({
    type: String,
    isArray: true,
  })
  fileNames: string[];

  @ApiProperty()
  cameraID: string;

  @ApiProperty({
    type: Date,
  })
  start: Date;

  @ApiProperty({
    type: Date,
  })
  end: Date;
}

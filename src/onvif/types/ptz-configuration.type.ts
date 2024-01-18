import { ApiProperty } from '@nestjs/swagger';
import { PTZSpeed } from './ptz-speed.type';
import {
  PanTiltLimits,
  PTZConfigurationExtension,
  ZoomLimits,
} from './ptz.types';

export class PTZConfiguration {
  @ApiProperty()
  token: string;
  @ApiProperty()
  name: string;

  @ApiProperty()
  useCount: number;

  @ApiProperty()
  moveRamp?: number;

  @ApiProperty()
  presetRamp?: number;

  @ApiProperty()
  presetTourRamp?: number;

  @ApiProperty()
  nodeToken: string;

  @ApiProperty()
  defaultAbsolutePantTiltPositionSpace?: string;

  @ApiProperty()
  defaultAbsoluteZoomPositionSpace?: string;

  @ApiProperty()
  defaultRelativePanTiltTranslationSpace?: string;

  @ApiProperty()
  defaultRelativeZoomTranslationSpace?: string;

  @ApiProperty()
  defaultContinuousPanTiltVelocitySpace?: string;

  @ApiProperty()
  defaultContinuousZoomVelocitySpace?: string;

  @ApiProperty()
  defaultPTZSpeed?: PTZSpeed;

  @ApiProperty()
  defaultPTZTimeout?: string;

  @ApiProperty()
  panTiltLimits?: PanTiltLimits;

  @ApiProperty()
  zoomLimits?: ZoomLimits;

  @ApiProperty()
  extension?: PTZConfigurationExtension;
}

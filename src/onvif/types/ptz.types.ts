export interface PTControlDirection {
  /** Optional element to configure related parameters for E-Flip */
  EFlip?: {
    /** Parameter to enable/disable E-Flip feature */
    mode: 'OFF' | 'ON' | 'Extended';
  };
  /** Optional element to configure related parameters for reversing of PT Control Direction */
  reverse: {
    /** Parameter to enable/disable Reverse feature */
    mode: 'OFF' | 'ON' | 'AUTO' | 'Extended';
  };
  extension: any;
}

export interface PTZConfigurationExtension {
  /** Optional element to configure PT Control Direction related features */
  PTControlDirection: PTControlDirection;
  extension: any;
}

export interface Range {
  min: number;
  max: number;
}

export interface Space1DDescription {
  /** A URI of coordinate systems */
  URI: string;
  /** A range of x-axis */
  XRange: Range;
}

export interface Space2DDescription {
  /** A URI of coordinate systems */
  URI: string;
  /** A range of x-axis */
  XRange: Range;
  /** A range of y-axis */
  YRange: Range;
}

export interface ZoomLimits {
  range: Space1DDescription;
}

export interface PanTiltLimits {
  /** A range of pan tilt limits */
  range: Space2DDescription;
}

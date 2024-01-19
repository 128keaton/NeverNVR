import { PTZMoveDirection } from '../enums';

export interface MovePayload {
  cameraID: string;
  amount: number;
  directions: PTZMoveDirection[];
  speed?: number;
}

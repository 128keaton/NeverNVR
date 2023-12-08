import { Socket } from "socket.io";

export class GatewaySocket extends Socket {
  gatewayID?: string;
}

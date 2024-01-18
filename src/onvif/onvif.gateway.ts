import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { MovePayload, PresetPayload, ZoomPayload } from './payloads';
import { MqttService } from '@vipstorage/nest-mqtt';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  path: '/onvif.io/',
})
export class OnvifGateway {
  constructor(private mqttService: MqttService) {}

  @SubscribeMessage('zoom')
  async zoom(@MessageBody() payload: ZoomPayload) {
    await this.mqttService.publish(
      `never/ptz/${payload.cameraID}/zoom`,
      payload,
    );

    return { success: true };
  }

  @SubscribeMessage('move')
  async move(@MessageBody() payload: MovePayload) {
    await this.mqttService.publish(
      `never/ptz/${payload.cameraID}/move`,
      payload,
    );

    return { success: true };
  }

  @SubscribeMessage('preset')
  async preset(@MessageBody() payload: PresetPayload) {
    await this.mqttService.publish(
      `never/ptz/${payload.cameraID}/preset`,
      payload,
    );

    return { success: true };
  }
}

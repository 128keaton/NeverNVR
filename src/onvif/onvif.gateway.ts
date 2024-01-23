import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { MovePayload, PresetPayload, ZoomPayload } from './payloads';
import { MqttService } from '@vipstorage/nest-mqtt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  path: '/onvif.io/',
})
export class OnvifGateway {
  private logger = new Logger(OnvifGateway.name);

  constructor(private mqttService: MqttService) {}

  @SubscribeMessage('zoom')
  async zoom(@MessageBody() payload: ZoomPayload) {
    await this.mqttService.publish(
      `never/ptz/${payload.cameraID}/zoom`,
      payload,
    );

    this.logger.verbose(
      `Publishing ${JSON.stringify(payload)} to 'never/ptz/${
        payload.cameraID
      }/zoom'`,
    );

    return { success: true };
  }

  @SubscribeMessage('move')
  async move(@MessageBody() payload: MovePayload) {
    await this.mqttService.publish(
      `never/ptz/${payload.cameraID}/move`,
      payload,
    );

    this.logger.verbose(
      `Publishing ${JSON.stringify(payload)} to 'never/ptz/${
        payload.cameraID
      }/move'`,
    );

    return { success: true };
  }

  @SubscribeMessage('preset')
  async preset(@MessageBody() payload: PresetPayload) {
    await this.mqttService.publish(
      `never/ptz/${payload.cameraID}/preset`,
      payload,
    );

    this.logger.verbose(
      `Publishing ${JSON.stringify(payload)} to 'never/ptz/${
        payload.cameraID
      }/preset'`,
    );

    return { success: true };
  }
}

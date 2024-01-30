import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import {
  MovePayload,
  PresetPayload,
  StopPayload,
  ZoomPayload,
} from './payloads';
import { MqttService } from '@vipstorage/nest-mqtt';
import { Logger } from '@nestjs/common';
import { CamerasService } from '../cameras/cameras.service';
import { OnvifService } from './onvif.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  path: '/onvif.io/',
})
export class OnvifGateway {
  private logger = new Logger(OnvifGateway.name);

  constructor(
    private onvifService: OnvifService,
    private mqttService: MqttService,
    private camerasService: CamerasService,
  ) {}

  @SubscribeMessage('zoom')
  async zoom(@MessageBody() payload: ZoomPayload) {
    const isCameraConnected = await this.camerasService.isCameraConnected(
      payload.cameraID,
    );

    if (isCameraConnected) {
      await this.mqttService.publish(
        `never/ptz/${payload.cameraID}/zoom`,
        payload,
      );

      this.logger.verbose(
        `Publishing ${JSON.stringify(payload)} to 'never/ptz/${
          payload.cameraID
        }/zoom'`,
      );
    } else {
      await this.onvifService.zoom(payload.cameraID, payload.amount);

      this.logger.verbose(
        `Sending zoom request to camera ID ${payload.cameraID}`,
      );
    }

    return { success: true };
  }

  @SubscribeMessage('move')
  async move(@MessageBody() payload: MovePayload) {
    const isCameraConnected = await this.camerasService.isCameraConnected(
      payload.cameraID,
    );

    if (isCameraConnected) {
      await this.mqttService.publish(
        `never/ptz/${payload.cameraID}/move`,
        payload,
      );

      this.logger.verbose(
        `Publishing ${JSON.stringify(payload)} to 'never/ptz/${
          payload.cameraID
        }/move'`,
      );
    } else {
      await this.onvifService.move(
        payload.cameraID,
        payload.directions,
        payload.amount,
        payload.speed,
      );

      this.logger.verbose(
        `Sending move request to camera ID ${payload.cameraID}`,
      );
    }

    return { success: true };
  }

  @SubscribeMessage('stop')
  async stop(@MessageBody() payload: StopPayload) {
    await this.mqttService.publish(
      `never/ptz/${payload.cameraID}/stop`,
      payload,
    );

    this.logger.verbose(
      `Publishing ${JSON.stringify(payload)} to 'never/ptz/${
        payload.cameraID
      }/stop'`,
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

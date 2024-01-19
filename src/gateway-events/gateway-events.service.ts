import { Injectable } from '@nestjs/common';
import { MqttService } from '@vipstorage/nest-mqtt';

@Injectable()
export class GatewayEventsService {
  constructor(private mqttService: MqttService) {}

  async handleCamera(
    eventType: 'created' | 'deleted' | 'updated' | 'sync',
    id: string,
    payload: any,
  ) {
    const packet = await this.mqttService.publish(
      `never/camera/${id}/${eventType}`,
      payload,
    );
    return !!packet;
  }

  async handleClip(
    eventType: 'created' | 'deleted' | 'updated' | 'sync',
    id: string,
    payload: any,
  ) {
    const packet = await this.mqttService.publish(
      `never/clip/${id}/${eventType}`,
      payload,
    );
    return !!packet;
  }

  async handleSnapshot(
    eventType: 'created' | 'deleted' | 'updated' | 'sync',
    id: string,
    payload: any,
  ) {
    const packet = await this.mqttService.publish(
      `never/snapshot/${id}/${eventType}`,
      payload,
    );
    return !!packet;
  }

}

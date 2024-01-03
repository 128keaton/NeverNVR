import { Module } from '@nestjs/common';
import { GatewayEventsService } from './gateway-events.service';
import { ConfigService } from '@nestjs/config';
import { mqttConfig } from '../config/mqtt.config';
import { MqttModule } from '@vipstorage/nest-mqtt';

@Module({
  imports: [
    MqttModule.forRootAsync({
      useFactory: (configService: ConfigService) =>
        mqttConfig('NEVER', configService),
      inject: [ConfigService],
    }),
  ],
  providers: [GatewayEventsService],
  exports: [GatewayEventsService],
})
export class GatewayEventsModule {}

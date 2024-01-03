import { ConfigService } from '@nestjs/config';

export const mqttConfig = (key: string, configService: ConfigService) => {
  const baseKey = `MQTT_${key}`;
  const url = new URL(
    configService.get(`${baseKey}_URL`) || 'mqtt://mqtt.vipbackend.com:1883',
  );

  const { host, protocol, port } = url;
  let { username, password } = url;
  let mqttPort = 1883;

  if (!username) username = configService.get(`${baseKey}_USERNAME`) || 'tibbo';
  if (!password)
    password = configService.get(`${baseKey}_PASSWORD`) || 'tibbo123';
  if (!isNaN(Number(port))) mqttPort = Number(port);

  return {
    host: host.split(':')[0],
    protocol: protocol.split(':')[0] as any,
    port: mqttPort,
    username,
    password,
  };
};

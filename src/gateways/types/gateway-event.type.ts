import { Gateway } from './gateway.type';

export type GatewayEvent = {
  gateway: Gateway;
  eventType: 'updated' | 'created' | 'deleted' | 'sync';
  id: string;
};

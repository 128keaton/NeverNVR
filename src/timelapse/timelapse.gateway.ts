import { WebSocketGateway } from '@nestjs/websockets';
import { TimelapseEvent } from './types/timelapse.event';
import { CommonGateway } from '../common/common-gateway';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  path: '/timelapse.io/',
})
export class TimelapseGateway extends CommonGateway {
  handleTimelapseEvent(event: TimelapseEvent) {
    const timelapse = event.timelapse;

    delete timelapse.gatewayID;

    // Get all UI clients (i.e. non gateway clients)
    const webClients = this.getWebClients();

    // Send the UI clients the same update
    webClients.forEach((client) => {
      client.emit(event.eventType, {
        id: event.timelapse.id,
        timelapse,
      });
    });
  }
}

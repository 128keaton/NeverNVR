import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { GatewaysService } from '../gateways/gateways.service';
import { CommonGateway } from '../common/common-gateway';
import { Socket } from 'socket.io';
import { ClipsService } from './clips.service';
import { Clip, ClipEvent } from './type';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  path: '/clips.io/',
})
export class ClipsGateway extends CommonGateway {
  override logger = new Logger(ClipsGateway.name);

  constructor(
    override gatewaysService: GatewaysService,
    private clipsService: ClipsService,
  ) {
    super(gatewaysService);
    this.logger.verbose('Clips gateway active');

    this.clipsService.clipEvents.subscribe((event) => {
      this.handleClipEvent(event, false);
    });
  }

  handleClipEvent(event: ClipEvent, emitLocal = true) {
    const clip = {
      ...event.clip,
    };

    const client = this.getGatewayClient(event.clip.gatewayID);

    if (!!client && emitLocal) {
      delete clip.gatewayID;
      const didEmit = client.emit(event.eventType, {
        id: event.clip.id,
        clip: {
          ...clip,
          camera: {
            id: event.cameraID,
          },
        },
        cameraID: event.cameraID,
      });

      if (!didEmit) this.logger.warn('Could not emit');
    }

    // Get all UI clients (i.e. non gateway clients)
    const webClients = this.getWebClients();

    // Send the UI clients the same update
    webClients.forEach((client) => {
      client.emit(event.eventType, {
        id: event.clip.id,
        clip,
        cameraID: event.cameraID,
      });
    });
  }

  @SubscribeMessage('response')
  handleResponse(
    @MessageBody() response: { type: string; data?: any },
    @ConnectedSocket() client: Socket,
  ) {
    switch (response.type) {
      case 'identify':
        this.logger.verbose(
          `Client with ID ${client.id} returned gatewayID ${response.data.gatewayID}`,
        );
        this.associateGatewayID(client.id, response.data.gatewayID).then();
        break;
      default:
        this.logger.verbose(
          `Client with ID ${client.id} returned unknown response ${
            response.type
          } with data ${response.data || 'none'}`,
        );
        break;
    }
  }

  @SubscribeMessage('created')
  handleCreated(
    @MessageBody()
    request: {
      clip: Clip;
      id: string;
      cameraID: string;
      gatewayID: string;
    },
  ) {
    this.logger.verbose(`Creating new clip from ${request.gatewayID}`);
    return this.clipsService.create(
      {
        ...request.clip,
        id: request.id,
        gatewayID: request.gatewayID,
      },
      request.cameraID,
      false,
    );
  }

  @SubscribeMessage('updated')
  handleUpdated(
    @MessageBody()
    request: {
      clip: Clip;
      id: string;
      cameraID: string;
      gatewayID: string;
    },
  ) {
    return this.clipsService.update(request.id, request.clip);
  }
}

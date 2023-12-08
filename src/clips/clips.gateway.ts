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
  }

  handleClipEvent(event: ClipEvent) {
    const client = this.getGatewayClient(event.clip.gatewayID);

    const clip = {
      ...event.clip,
    };

    delete clip.gatewayID;

    const didEmit = client.emit(event.eventType, {
      id: event.clip.id,
      clip,
      cameraName: event.cameraName,
    });

    if (!didEmit) this.logger.warn('Could not emit');

    return didEmit;
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
      cameraName: string;
      gatewayID: string;
    },
  ) {
    return this.clipsService.create(
      {
        ...request.clip,
        id: request.id,
        gatewayID: request.gatewayID,
      },
      request.cameraName,
      false,
    );
  }

  @SubscribeMessage('updated')
  handleUpdated(
    @MessageBody()
    request: {
      clip: Clip;
      id: string;
      cameraName: string;
      gatewayID: string;
    },
  ) {
    this.logger.verbose('Updated', request);
    return this.clipsService.update(request.id, request.clip);
  }
}

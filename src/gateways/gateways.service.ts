import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import {
  GatewayCreate,
  GatewayDiskSpace,
  GatewayEvent,
  GatewayStats,
  GatewayUpdate,
} from './types';
import { ConnectionStatus } from '@prisma/client';
import { lastValueFrom, map, ReplaySubject } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CameraEvent } from '../cameras/types';
import { AxiosRequestConfig } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GatewaysService {
  private _gatewayEvents = new ReplaySubject<GatewayEvent>();
  private readonly allowDisconnectedGateway: boolean = false;

  get gatewayEvents() {
    return this._gatewayEvents.asObservable();
  }

  constructor(
    private prismaService: PrismaService,
    private httpService: HttpService,
    private configService: ConfigService,
    @InjectQueue('cameras') private camerasQueue: Queue<CameraEvent>,
  ) {
    this.allowDisconnectedGateway = !!this.configService.get(
      'ALLOW_DISCONNECTED_GATEWAY',
    );
  }

  create(data: GatewayCreate) {
    return this.prismaService.gateway.create({
      data,
    });
  }

  get(id: string) {
    return this.prismaService.gateway.findFirst({
      where: {
        id,
      },
      include: {
        cameras: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async restartJanus(gatewayID: string) {
    const gateway = await this.getGateway(gatewayID);

    return lastValueFrom(
      this.httpService
        .get(
          `${gateway.connectionURL}/api/system/restart/janus`,
          this.getConfig(gateway.connectionToken),
        )
        .pipe(
          map((response) => {
            return {
              success: response.status === 200,
            };
          }),
        ),
    );
  }

  async getJanusOutput(gatewayID: string) {
    const gateway = await this.getGateway(gatewayID);

    return lastValueFrom(
      this.httpService
        .get<{ output: string }>(
          `${gateway.connectionURL}/api/system/logs/janus`,
          this.getConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data)),
    );
  }

  async getGatewayStats(gatewayID: string) {
    const gateway = await this.getGateway(gatewayID);

    return lastValueFrom(
      this.httpService
        .get<GatewayStats>(
          `${gateway.connectionURL}/api/stats`,
          this.getConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data)),
    );
  }

  async getDiskSpace(gatewayID: string) {
    const gateway = await this.getGateway(gatewayID);

    return lastValueFrom(
      this.httpService
        .get<GatewayDiskSpace>(
          `${gateway.connectionURL}/api/system/space`,
          this.getConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data)),
    );
  }

  async getMany() {
    const gateways = await this.prismaService.gateway.findMany();

    return {
      total: gateways.length,
      data: gateways,
    };
  }

  delete(id: string) {
    return this.prismaService.gateway.delete({
      where: {
        id,
      },
    });
  }

  update(id: string, data: GatewayUpdate) {
    return this.prismaService.gateway.update({
      where: {
        id,
      },
      data,
    });
  }

  async updateStatus(id: string, status: ConnectionStatus) {
    const gateway = await this.prismaService.gateway.update({
      where: {
        id,
      },
      data: {
        status,
        lastConnection: status === 'CONNECTED' ? new Date() : undefined,
      },
    });

    const emitCameras = async (
      newStatus: 'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN',
    ) => {
      const camerasToEmit = await this.prismaService.camera.findMany({
        where: {
          status: {
            not: newStatus,
          },
        },
      });

      camerasToEmit.forEach((camera) =>
        this.camerasQueue.add('outgoing', {
          camera,
          eventType: 'updated',
        }),
      );
    };

    switch (gateway.status) {
      case 'DISCONNECTED':
        await this.prismaService.camera.updateMany({
          where: {
            gatewayID: gateway.id,
            status: {
              not: 'DISCONNECTED',
            },
          },
          data: {
            status: 'DISCONNECTED',
          },
        });
        await emitCameras('DISCONNECTED');
        break;

      case 'UNKNOWN':
        await this.prismaService.camera.updateMany({
          where: {
            gatewayID: gateway.id,
            status: {
              not: 'DISCONNECTED',
            },
          },
          data: {
            status: 'DISCONNECTED',
          },
        });
        await emitCameras('DISCONNECTED');
        break;
      default:
        break;
    }

    this._gatewayEvents.next({
      eventType: 'updated',
      gateway,
      id: gateway.id,
    });

    return gateway;
  }

  private async getGateway(id: string) {
    const gateway = await this.prismaService.gateway.findFirst({
      where: {
        id,
      },
    });

    if (!gateway)
      throw new HttpException(
        `Could not find gateway with ID ${id}`,
        HttpStatus.NOT_FOUND,
      );

    if (gateway.status === 'DISCONNECTED' && !this.allowDisconnectedGateway)
      throw new HttpException(
        `Gateway is disconnected ${id}`,
        HttpStatus.BAD_REQUEST,
      );

    return gateway;
  }

  private getConfig(apiKey: string): AxiosRequestConfig {
    return {
      headers: {
        'api-key': apiKey,
      },
    };
  }
}

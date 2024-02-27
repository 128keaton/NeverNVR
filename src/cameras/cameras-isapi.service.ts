import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { AxiosRequestConfig, HttpStatusCode, ResponseType } from 'axios';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';

@Injectable()
export class CamerasISAPIService {
  constructor(
    private prismaService: PrismaService,
    private httpService: HttpService,
  ) {}

  async getCameraStreamSettings(cameraID: string, channelID: number = 101) {
    const camera = await this.getValidCamera(cameraID);
    const gateway = await this.getValidGateway(camera.gatewayID);

    return lastValueFrom(
      this.httpService
        .get(
          `${gateway.connectionURL}/api/cameras/${cameraID}/isapi/streamSettings/${channelID}`,
          this.getConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data)),
    );
  }

  async updateCameraStreamSettings(
    cameraID: string,
    settings: any,
    channelID: number = 101,
  ) {
    const camera = await this.getValidCamera(cameraID);
    const gateway = await this.getValidGateway(camera.gatewayID);

    return lastValueFrom(
      this.httpService
        .put(
          `${gateway.connectionURL}/api/cameras/${cameraID}/isapi/streamSettings/${channelID}`,
          settings,
          this.getConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data)),
    );
  }

  private async getValidGateway(gatewayID: string) {
    const gateway = await this.prismaService.gateway.findFirst({
      where: {
        id: gatewayID,
      },
    });

    if (!gateway)
      throw new HttpException(
        `Could not find gateway with ID ${gatewayID}`,
        HttpStatus.NOT_FOUND,
      );

    return gateway;
  }

  private async getValidCamera(cameraID: string) {
    const camera = await this.prismaService.camera.findFirst({
      where: {
        id: cameraID,
      },
      include: {
        gateway: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!camera)
      throw new HttpException('camera not found', HttpStatusCode.NotFound);

    if (camera.manufacturer.toLowerCase() !== 'hikvision')
      throw new HttpException('invalid camera', HttpStatusCode.BadRequest);

    return camera;
  }

  private getConfig(
    apiKey: string,
    responseType?: ResponseType,
  ): AxiosRequestConfig {
    return {
      responseType,
      headers: {
        'api-key': apiKey,
      },
    };
  }
}

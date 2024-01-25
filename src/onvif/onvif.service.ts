import { HttpException, Injectable } from '@nestjs/common';
import { CamerasService } from '../cameras/cameras.service';
import { AxiosRequestConfig, HttpStatusCode } from 'axios';
import { HttpService } from '@nestjs/axios';
import { catchError, lastValueFrom, map, of } from 'rxjs';
import { GatewaysService } from '../gateways/gateways.service';
import { DeviceInformationResponse, PTZPresetsResponse } from './responses';
import { PTZMoveDirection } from './enums';

@Injectable()
export class OnvifService {
  constructor(
    private camerasService: CamerasService,
    private gatewaysService: GatewaysService,
    private httpService: HttpService,
  ) {}

  async getPresets(cameraID: string) {
    const gateway = await this.getGateway(cameraID);

    return lastValueFrom(
      this.httpService
        .get<PTZPresetsResponse>(
          `${gateway.connectionURL}/api/onvif/${cameraID}/presets`,
          this.getConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data)),
    );
  }

  async getDeviceInformation(cameraID: string) {
    const gateway = await this.getGateway(cameraID);

    const deviceInformation = await lastValueFrom(
      this.httpService
        .get<DeviceInformationResponse>(
          `${gateway.connectionURL}/api/onvif/${cameraID}/info`,
          this.getConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data)),
    );

    const capabilities: { canZoom: boolean; canPanTilt: boolean } = {
      canZoom: false,
      canPanTilt: false,
    };

    if (deviceInformation.ptzConfigurations.length > 0) {
      capabilities.canPanTilt =
        !!deviceInformation.ptzConfigurations[0].panTiltLimits;
      capabilities.canZoom =
        !!deviceInformation.ptzConfigurations[0].zoomLimits;
    }

    return {
      ...capabilities,
      ...deviceInformation,
    };
  }

  async move(
    cameraID: string,
    directions: PTZMoveDirection[],
    amount: number,
    speed?: number,
  ) {
    const gateway = await this.getGateway(cameraID);

    return lastValueFrom(
      this.httpService
        .post<{ success: boolean }>(
          `${gateway.connectionURL}/api/onvif/${cameraID}/move`,
          {
            directions,
            amount,
            speed,
          },
          this.getConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data.success)),
    );
  }

  async stop(cameraID: string, panTilt: boolean = true, zoom: boolean = true) {
    const gateway = await this.getGateway(cameraID);

    return lastValueFrom(
      this.httpService
        .post<{ success: boolean }>(
          `${gateway.connectionURL}/api/onvif/${cameraID}/stop`,
          {
            panTilt,
            zoom,
          },
          this.getConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data.success)),
    );
  }

  async goToPreset(cameraID: string, preset: string) {
    const gateway = await this.getGateway(cameraID);
    return lastValueFrom(
      this.httpService
        .post<{ success: boolean }>(
          `${gateway.connectionURL}/api/onvif/${cameraID}/preset`,
          {
            preset,
          },
          this.getConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data.success)),
    );
  }

  async zoom(cameraID: string, amount: number) {
    const gateway = await this.getGateway(cameraID);

    return lastValueFrom(
      this.httpService
        .post<{ success: boolean }>(
          `${gateway.connectionURL}/api/onvif/${cameraID}/zoom`,
          {
            amount,
          },
          this.getConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data.success)),
    );
  }

  async getONVIFStatus(cameraID: string) {
    const gateway = await this.getGateway(cameraID);

    return lastValueFrom(
      this.httpService
        .get<{
          onvif: boolean;
          reason?: string;
          canZoom: boolean;
          canPanTilt: boolean;
        }>(
          `${gateway.connectionURL}/api/onvif/${cameraID}/onvifStatus`,
          this.getConfig(gateway.connectionToken),
        )
        .pipe(
          map((response) => response.data),
          catchError((err) => {
            return of(err);
          }),
        ),
    );
  }

  private async getGateway(cameraID: string) {
    const camera = await this.camerasService.get(cameraID);

    if (!camera)
      throw new HttpException(
        `Cannot find camera for ID ${cameraID}`,
        HttpStatusCode.NotFound,
      );

    const gateway = await this.gatewaysService.get(camera.gatewayID);

    if (!gateway)
      throw new HttpException(
        `Cannot find gateway for ID ${camera.gatewayID}`,
        HttpStatusCode.NotFound,
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

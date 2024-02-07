import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { Job, Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import {
  CameraEvent,
  CameraUpdate,
  CameraCreate,
  Camera,
  CameraSnapshotsResponse,
} from './types';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map, ReplaySubject } from 'rxjs';
import { Prisma } from '@prisma/client';
import { S3Service } from '../services/s3/s3.service';
import { AxiosRequestConfig, HttpStatusCode, ResponseType } from 'axios';
import { createPaginator } from 'prisma-pagination';
import { AppHelpers } from '../app.helpers';

@Injectable()
export class CamerasService {
  private _cameraEvents = new ReplaySubject<CameraEvent>();
  private logger = new Logger(CamerasService.name);

  get cameraEvents() {
    return this._cameraEvents.asObservable();
  }

  constructor(
    private s3Service: S3Service,
    private httpService: HttpService,
    private prismaService: PrismaService,
    @InjectQueue('cameras') private camerasQueue: Queue<CameraEvent>,
  ) {
    this.camerasQueue.on(
      'completed',
      (job: Job<CameraEvent>, response: boolean) => {
        if (job.data.eventType !== 'deleted')
          return this.updateSynchronized(job.data.camera.id, response);
      },
    );
  }

  get(id: string) {
    return this.prismaService.camera.findFirst({
      where: {
        id,
      },
      include: {
        gateway: {
          select: {
            name: true,
            id: true,
            connectionURL: true,
          },
        },
      },
    });
  }

  async getDetails(id: string) {
    const camera = await this.get(id);

    if (!camera)
      throw new HttpException(
        `Could not find camera with ID ${id}`,
        HttpStatus.NOT_FOUND,
      );

    const gateway = await this.getValidGateway(camera.gatewayID);

    return lastValueFrom(
      this.httpService
        .get<Camera>(
          `${gateway.connectionURL}/api/cameras/${id}`,
          this.getConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data)),
    );
  }

  async getLivePreview(id: string) {
    const camera = await this.get(id);

    if (!camera)
      throw new HttpException(
        `Could not find camera with ID ${id}`,
        HttpStatus.NOT_FOUND,
      );

    const gateway = await this.getValidGateway(camera.gatewayID);

    return this.httpService.axiosRef.get(
      `${gateway.connectionURL}/api/cameras/${id}/preview.jpeg`,
      this.getConfig(gateway.connectionToken, 'stream'),
    );
  }

  async getStalePreview(id: string) {
    const snapshot = await this.prismaService.snapshot
      .findFirst({
        where: {
          cameraID: id,
        },
        orderBy: {
          timestamp: 'desc',
        },
        select: {
          timestamp: true,
          cameraID: true,
          fileName: true,
          gateway: {
            select: {
              s3Bucket: true,
            },
          },
        },
      })
      .catch((err) => {
        this.logger.error(err);
        return null;
      });

    if (!snapshot)
      throw new HttpException(
        'Could not find snapshot',
        HttpStatusCode.NotFound,
      );

    const fileKey = AppHelpers.getFileKey(
      snapshot.fileName,
      snapshot.cameraID,
      '.jpeg',
    );

    return this.s3Service.getFile(fileKey, snapshot.gateway.s3Bucket);
  }

  async getSnapshots(
    id: string,
    limit: number = 50,
  ): Promise<CameraSnapshotsResponse> {
    const snapshotCount = await this.prismaService.snapshot.count({
      where: {
        cameraID: id,
      },
    });

    const snapshots = await this.prismaService.snapshot.findMany({
      where: {
        cameraID: id,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
      select: {
        timestamp: true,
        cameraID: true,
        id: true,
      },
    });

    return {
      total: snapshotCount,
      snapshots: snapshots.map((snapshot) => {
        return {
          cameraID: snapshot.cameraID,
          snapshotID: snapshot.id,
          timestamp: snapshot.timestamp,
        };
      }),
    };
  }

  async getLogOutput(id: string) {
    const camera = await this.getValidCamera(id);
    const gateway = await this.getValidGateway(camera.gatewayID);

    return lastValueFrom(
      this.httpService
        .get(
          `${gateway.connectionURL}/api/cameras/${id}/logs`,
          this.getConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data)),
    );
  }

  async restartRecording(id: string) {
    const camera = await this.getValidCamera(id);
    const gateway = await this.getValidGateway(camera.gatewayID);

    return lastValueFrom(
      this.httpService
        .get<{ restarted: boolean }>(
          `${gateway.connectionURL}/api/cameras/${id}/restart/recording`,
          this.getConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data)),
    );
  }

  async restartStreaming(id: string) {
    const camera = await this.getValidCamera(id);
    const gateway = await this.getValidGateway(camera.gatewayID);

    return lastValueFrom(
      this.httpService
        .get<{ restarted: boolean }>(
          `${gateway.connectionURL}/api/cameras/${id}/restart/streaming`,
          this.getConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data)),
    );
  }

  async getMany(
    pageSize?: number,
    pageNumber?: number,
    search?: string,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc' | '',
    gatewayID?: string,
  ) {
    const paginate = createPaginator({ perPage: pageSize || 40 });

    const orderBy: Prisma.CameraOrderByWithRelationInput = {};
    let where: Prisma.CameraWhereInput = {};

    if (!!search) {
      where = {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            gateway: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        ],
      };
    }

    if (!!gatewayID) {
      if (gatewayID.includes(',')) {
        const gatewayIDs = gatewayID.split(',');
        where = {
          ...where,
          gatewayID: {
            in: gatewayIDs,
          },
        };
      } else {
        where = {
          ...where,
          gatewayID,
        };
      }
    }

    if (!!sortBy) orderBy[sortBy] = sortDirection || 'desc';
    else orderBy['end'] = sortDirection || 'desc';

    return paginate<Camera, Prisma.CameraFindManyArgs>(
      this.prismaService.camera,
      {
        where,
        orderBy,
        include: {
          gateway: {
            select: {
              name: true,
              connectionURL: true,
            },
          },
        },
      },
      {
        page: pageNumber,
        perPage: pageSize,
      },
    );
  }

  async create(create: CameraCreate, emit = true) {
    const gatewayID = `${create.gatewayID}`;

    this.logger.verbose(
      `Creating camera ${create.name} on ${create.gatewayID}`,
    );

    const camera = await this.prismaService.camera.create({
      data: {
        id: create.id,
        name: create.name,
        stream: create.stream,
        record: create.record,
        type: create.type,
        manufacturer: create.manufacturer,
        hardwareEncoderPriority: create.hardwareEncoderPriority,
        gateway: {
          connect: {
            id: gatewayID,
          },
        },
      },
    });

    if (!camera) return camera;

    if (emit) {
      this.logger.verbose(
        `Emitting outgoing created event for camera ${camera.id}`,
      );
      await this.camerasQueue.add('outgoing', {
        eventType: 'created',
        camera,
        create,
      });
    }

    this.logger.verbose(`Adding created event for camera ${camera.id}`);
    this._cameraEvents.next({
      eventType: 'created',
      camera,
      create,
    });

    return camera;
  }

  async delete(id: string, emit = true) {
    const camera = await this.prismaService.camera
      .delete({
        where: {
          id,
        },
      })
      .catch((reason) => {
        this.logger.error(reason);
        return null;
      });

    if (!camera)
      return {
        success: false,
      };

    if (emit)
      await this.camerasQueue.add('outgoing', {
        eventType: 'deleted',
        camera,
      });

    this._cameraEvents.next({
      eventType: 'deleted',
      camera,
    });

    return camera;
  }

  async update(id: string, update: CameraUpdate, emit = true) {
    const camera = await this.prismaService.camera
      .update({
        where: {
          id,
        },
        data: {
          stream: update.stream,
          record: update.record,
          status: !!update.ipAddress ? 'UNKNOWN' : update.status,
          name: update.name,
          deleteClipAfter: update.deleteClipAfter,
          deleteSnapshotAfter: update.deleteSnapshotAfter,
          synchronized: !emit,
          lastConnection: update.lastConnection,
          ipAddress: update.ipAddress,
          type: update.type,
          manufacturer: update.manufacturer,
          hardwareEncoderPriority: update.hardwareEncoderPriority,
        },
        include: {
          gateway: {
            select: {
              name: true,
              connectionURL: true,
            },
          },
        },
      })
      .catch((err: { name: string; code: string }) => {
        if (err.code !== 'P2025')
          this.logger.error(
            `Could not update camera with ID ${id}: ${JSON.stringify(err)}`,
          );
        else
          this.logger.warn(
            `Not able to update camera with ID ${id} because it does not exist on this NVR`,
          );

        return null;
      });

    if (!camera) return camera;

    if (emit)
      await this.camerasQueue.add('outgoing', {
        eventType: 'updated',
        camera,
        update,
      });

    this._cameraEvents.next({
      eventType: 'updated',
      camera,
      update,
    });

    return camera;
  }

  async isCameraConnected(id: string) {
    const camera = await this.prismaService.camera.findFirst({
      where: {
        id,
      },
      select: {
        status: true,
        gateway: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!camera) return false;

    if (camera.gateway.status !== 'CONNECTED') return false;

    return camera.status === 'CONNECTED';
  }

  private updateSynchronized(id: string, synchronized: boolean) {
    return this.prismaService.camera.update({
      where: {
        id,
      },
      data: {
        synchronized,
      },
    });
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

  private async getValidCamera(id: string) {
    const camera = await this.get(id);

    if (!camera)
      throw new HttpException(
        `Could not find camera with ID ${id}`,
        HttpStatus.NOT_FOUND,
      );

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

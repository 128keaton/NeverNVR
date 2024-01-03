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
import { lastValueFrom, map, Subject } from 'rxjs';
import { ConnectionStatus } from '@prisma/client';
import { AppHelpers } from '../app.helpers';
import { S3Service } from '../services/s3/s3.service';
import { HttpStatusCode } from 'axios';

@Injectable()
export class CamerasService {
  private _cameraEvents = new Subject<CameraEvent>();
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

    const gateway = await this.prismaService.gateway.findFirst({
      where: {
        id: camera.gatewayID,
      },
    });

    if (!gateway)
      throw new HttpException(
        `Could not find gateway with ID ${camera.gatewayID}`,
        HttpStatus.NOT_FOUND,
      );

    return lastValueFrom(
      this.httpService
        .get<Camera>(`${gateway.connectionURL}/api/cameras/${id}`)
        .pipe(map((response) => response.data)),
    );
  }

  async getPreview(id: string) {
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
    const camera = await this.get(id);

    if (!camera)
      throw new HttpException(
        `Could not find camera with ID ${id}`,
        HttpStatus.NOT_FOUND,
      );

    const gateway = await this.prismaService.gateway.findFirst({
      where: {
        id: camera.gatewayID,
      },
    });

    if (!gateway)
      throw new HttpException(
        `Could not find gateway with ID ${camera.gatewayID}`,
        HttpStatus.NOT_FOUND,
      );

    return lastValueFrom(
      this.httpService
        .get(`${gateway.connectionURL}/api/cameras/${id}/logs`)
        .pipe(map((response) => response.data)),
    );
  }

  async restartRecording(id: string) {
    const camera = await this.get(id);

    if (!camera)
      throw new HttpException(
        `Could not find camera with ID ${id}`,
        HttpStatus.NOT_FOUND,
      );

    const gateway = await this.prismaService.gateway.findFirst({
      where: {
        id: camera.gatewayID,
      },
    });

    if (!gateway)
      throw new HttpException(
        `Could not find gateway with ID ${camera.gatewayID}`,
        HttpStatus.NOT_FOUND,
      );

    return lastValueFrom(
      this.httpService
        .get<{ restarted: boolean }>(
          `${gateway.connectionURL}/api/cameras/${id}/restart/recording`,
        )
        .pipe(map((response) => response.data)),
    );
  }

  async restartStreaming(id: string) {
    const camera = await this.get(id);

    if (!camera)
      throw new HttpException(
        `Could not find camera with ID ${id}`,
        HttpStatus.NOT_FOUND,
      );

    const gateway = await this.prismaService.gateway.findFirst({
      where: {
        id: camera.gatewayID,
      },
    });

    if (!gateway)
      throw new HttpException(
        `Could not find gateway with ID ${camera.gatewayID}`,
        HttpStatus.NOT_FOUND,
      );

    return lastValueFrom(
      this.httpService
        .get<{ restarted: boolean }>(
          `${gateway.connectionURL}/api/cameras/${id}/restart/streaming`,
        )
        .pipe(map((response) => response.data)),
    );
  }

  async getMany() {
    const cameras = await this.prismaService.camera.findMany({
      include: {
        gateway: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      total: cameras.length,
      data: cameras,
    };
  }

  async create(create: CameraCreate, emit = true) {
    const gatewayID = `${create.gatewayID}`;

    const camera = await this.prismaService.camera.create({
      data: {
        id: create.id,
        name: create.name,
        stream: create.stream,
        record: create.record,
        gateway: {
          connect: {
            id: gatewayID,
          },
        },
      },
    });

    if (!camera) return camera;

    if (emit)
      await this.camerasQueue.add('outgoing', {
        eventType: 'created',
        camera,
        create,
      });

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
    const camera = await this.prismaService.camera.update({
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
      },
      include: {
        gateway: {
          select: {
            name: true,
            connectionURL: true,
          },
        },
      },
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

  async checkForMissingCameras(
    gatewayID: string,
    camerasFromGateway: {
      id: string;
      name: string;
      stream: boolean;
      record: boolean;
      lastConnection?: Date;
      synchronized: boolean;
      status: ConnectionStatus;
      deleteSnapshotAfter: number;
      deleteClipAfter: number;
    }[],
  ) {
    let camerasCreated = 0;
    for (const gatewayCamera of camerasFromGateway) {
      let camera = await this.get(gatewayCamera.id);

      if (!camera) {
        camera = await this.prismaService.camera.create({
          data: {
            id: gatewayCamera.id,
            name: gatewayCamera.name,
            stream: gatewayCamera.stream,
            record: gatewayCamera.record,
            lastConnection: gatewayCamera.lastConnection,
            synchronized: gatewayCamera.synchronized,
            status: gatewayCamera.status,
            deleteClipAfter: gatewayCamera.deleteClipAfter,
            deleteSnapshotAfter: gatewayCamera.deleteSnapshotAfter,
            gateway: {
              connect: {
                id: gatewayID,
              },
            },
          },
          include: {
            gateway: {
              select: {
                id: true,
                name: true,
                connectionURL: true,
              },
            },
          },
        });

        this._cameraEvents.next({
          eventType: 'created',
          camera,
        });

        camerasCreated++;
      }
    }

    if (camerasCreated > 0)
      this.logger.verbose(`Created ${camerasCreated} cameras`);
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
}

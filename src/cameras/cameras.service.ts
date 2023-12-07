import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { Job, Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { CameraEvent, CameraUpdate, CameraCreate, Camera } from './types';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';

@Injectable()
export class CamerasService {
  private logger = new Logger(CamerasService.name);

  constructor(
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
    });
  }

  async getDetails(id: string) {
    const camera = await this.get(id);

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

  async getMany() {
    const cameras = await this.prismaService.camera.findMany();

    return {
      total: cameras.length,
      data: cameras,
    };
  }

  async create(create: CameraCreate, emit = true) {
    const gatewayID = `${create.gatewayID}`;

    const camera = await this.prismaService.camera.create({
      data: {
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

    return camera;
  }

  async update(id: string, update: CameraUpdate, emit = true) {
    const camera = await this.prismaService.camera.update({
      where: {
        id,
      },
      data: update,
    });

    if (!camera) return camera;

    if (emit)
      await this.camerasQueue.add('outgoing', {
        eventType: 'updated',
        camera,
        update,
      });

    return camera;
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

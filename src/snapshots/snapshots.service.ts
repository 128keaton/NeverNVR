import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { SnapshotCreate, SnapshotEvent } from './types';
import { HttpStatusCode } from 'axios';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createPaginator } from 'prisma-pagination';
import { Prisma, Snapshot } from '@prisma/client';
import { S3Service } from '../services/s3/s3.service';
import { AppHelpers } from '../app.helpers';

@Injectable()
export class SnapshotsService {
  private logger = new Logger(SnapshotsService.name);

  constructor(
    private prismaService: PrismaService,
    private s3Service: S3Service,
    @InjectQueue('snapshots') private snapshotsQueue: Queue<SnapshotEvent>,
  ) {}

  async create(create: SnapshotCreate, emitLocal = true) {
    const camera = await this.prismaService.camera.findFirst({
      where: {
        name: create.cameraName,
      },
      select: {
        timezone: true,
        deleteSnapshotAfter: true,
        id: true,
        name: true,
      },
    });

    if (!camera)
      throw new HttpException('Could not find camera', HttpStatusCode.NotFound);

    const snapshot = await this.prismaService.snapshot.create({
      data: {
        id: create.id,
        timezone: create.timezone || camera.timezone,
        fileName: create.fileName,
        fileSize: create.fileSize,
        width: create.width,
        height: create.height,
        timestamp: create.timestamp,
        gateway: {
          connect: {
            id: create.gatewayID,
          },
        },
        camera: {
          connect: {
            id: camera.id,
          },
        },
      },
    });

    if (!snapshot) return snapshot;

    if (emitLocal)
      await this.snapshotsQueue.add('outgoing', {
        eventType: 'created',
        snapshot,
        create,
        cameraName: camera.name,
      });

    return snapshot;
  }

  getSnapshots(pageSize?: number, pageNumber?: number, search?: string) {
    const paginate = createPaginator({ perPage: pageSize || 40 });

    let where: any = {};

    if (!!search) {
      where = {
        camera: {
          name: {
            contains: search,
          },
        },
      };
    }

    return paginate<Snapshot, Prisma.SnapshotFindManyArgs>(
      this.prismaService.snapshot,
      {
        where,
        orderBy: {
          timestamp: 'desc',
        },
        include: {
          camera: {
            select: {
              name: true,
              id: true,
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

  async getSnapshotsByCameraID(cameraID: string) {
    const snapshots = await this.prismaService.snapshot.findMany({
      where: {
        cameraID,
      },
      orderBy: {
        timestamp: 'desc',
      },
      select: {
        fileName: true,
        id: true,
        timezone: true,
        fileSize: true,
        width: true,
        height: true,
        timestamp: true,
        availableLocally: true,
        availableCloud: true,
        cameraID: true,
        camera: {
          select: {
            name: true,
          },
        },
      },
    });
    return {
      total: snapshots.length,
      data: snapshots,
    };
  }

  async update(id: string, data: any, emitLocal = true) {
    const snapshot = await this.prismaService.snapshot.update({
      where: {
        id,
      },
      data,
    });

    if (emitLocal)
      await this.snapshotsQueue.add('outgoing', {
        eventType: 'updated',
        snapshot,
      });

    return snapshot;
  }

  getSnapshot(id: string) {
    return this.prismaService.snapshot.findFirst({
      where: {
        id,
      },
      include: {
        camera: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async delete(id: string, emitLocal = true) {
    const deleted = await this.prismaService.snapshot.delete({
      where: {
        id,
      },
      include: {
        gateway: {
          select: {
            s3Bucket: true,
          },
        },
        camera: {
          select: {
            name: true,
          },
        },
      },
    });

    // Delete from S3
    const fileKey = AppHelpers.getFileKey(
      deleted.fileName,
      deleted.camera.name,
      '.jpeg',
    );

    await this.s3Service.deleteFile(fileKey, deleted.gateway.s3Bucket);

    if (emitLocal)
      await this.snapshotsQueue.add('outgoing', {
        eventType: 'deleted',
        snapshot: deleted,
        cameraName: deleted.camera.name,
      });

    return deleted;
  }

  async getSnapshotDownloadURL(id: string) {
    const snapshot = await this.prismaService.snapshot
      .findFirst({
        where: {
          id,
        },
        select: {
          fileName: true,
          gateway: {
            select: {
              s3Bucket: true,
            },
          },
          camera: {
            select: {
              name: true,
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

    if (!snapshot.uploaded)
      throw new HttpException('Snapshot not uploaded', HttpStatusCode.NotFound);

    const fileKey = AppHelpers.getFileKey(
      snapshot.fileName,
      snapshot.camera.name,
      '.jpeg',
    );
    return this.s3Service.getFileURL(fileKey, snapshot.gateway.s3Bucket);
  }

  async getSnapshotImage(id: string) {
    this.logger.log(`Get snapshot ${id}`);

    const snapshot = await this.prismaService.snapshot
      .findFirst({
        where: {
          id,
        },
        select: {
          fileName: true,
          gateway: {
            select: {
              s3Bucket: true,
            },
          },
          camera: {
            select: {
              name: true,
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
      snapshot.camera.name,
      '.jpeg',
    );

    return this.s3Service.getFile(fileKey, snapshot.gateway.s3Bucket);
  }
}

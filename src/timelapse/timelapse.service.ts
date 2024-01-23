import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { createPaginator } from 'prisma-pagination';
import { Prisma, Timelapse } from '@prisma/client';
import { VideoAnalyticsService } from '../video-analytics/video-analytics.service';
import { HttpStatusCode } from 'axios';
import { firstValueFrom } from 'rxjs';
import { TimelapseCreate } from './types';
import { S3Service } from '../services/s3/s3.service';
import { AppHelpers } from '../app.helpers';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { Queue } from 'bull';
import { TimelapseEvent } from './types/timelapse.event';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class TimelapseService {
  constructor(
    @InjectQueue('timelapse')
    private timelapseQueue: Queue<TimelapseEvent>,
    private snapshotsService: SnapshotsService,
    private s3Service: S3Service,
    private prismaService: PrismaService,
    private videoAnalyticsService: VideoAnalyticsService,
  ) {}

  async createTimelapse(request: TimelapseCreate) {
    const camera = await this.prismaService.camera.findFirst({
      where: {
        id: request.cameraID,
      },
      select: {
        gateway: {
          select: {
            id: true,
            s3Bucket: true,
          },
        },
      },
    });

    if (!camera || !camera.gateway)
      throw new HttpException('No camera', HttpStatusCode.BadRequest);

    const start = new Date(request.start);
    const end = new Date(request.end);

    const timeDifference = end.getTime() - start.getTime();
    const days = Math.round(timeDifference / (1000 * 3600 * 24));

    console.log('Calculated days', days);

    const timelapseJobID = await firstValueFrom(
      this.videoAnalyticsService.createTimelapse(
        request.fileNames,
        request.cameraID,
        camera.gateway.s3Bucket,
        start,
        end,
        days,
      ),
    );

    const timelapse = await this.prismaService.timelapse.create({
      data: {
        start: request.start,
        end: request.end,
        timelapseJobID,
        days,
        camera: {
          connect: {
            id: request.cameraID,
          },
        },
        gateway: {
          connect: {
            id: camera.gateway.id,
          },
        },
      },
      include: {
        gateway: true,
        camera: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    await this.timelapseQueue.add('outgoing', {
      timelapse,
      eventType: 'created',
    });

    return timelapse;
  }

  getTimelapse(id: string) {
    return this.prismaService.timelapse.findFirst({
      where: {
        id,
      },
      include: {
        gateway: true,
        camera: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });
  }

  async deleteTimelapse(id: string) {
    const deleted = await this.prismaService.timelapse.delete({
      where: {
        id,
      },
      include: {
        gateway: true,
        camera: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    if (!deleted) return deleted;

    if (deleted.fileName) {
      const fileName = this.getTimelapseFilename(deleted);
      await this.s3Service.deleteFile(fileName, deleted.gateway.s3Bucket);
    }

    await this.timelapseQueue.add('outgoing', {
      timelapse: deleted,
      eventType: 'deleted',
    });

    return deleted;
  }

  getTimelapses(
    cameraID?: string,
    pageSize?: number,
    pageNumber?: number,
    search?: string,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc' | '',
    dateStart?: Date,
    dateEnd?: Date,
    gatewayID?: string,
    showAvailableOnly?: string,
  ) {
    const paginate = createPaginator({ perPage: pageSize || 40 });

    const orderBy: Prisma.TimelapseOrderByWithRelationInput = {};
    let where: Prisma.TimelapseWhereInput = {};

    if (!!search) {
      where = {
        OR: [
          {
            camera: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
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
          {
            fileName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      };
    }

    if (!!dateStart) {
      where = {
        ...where,
        start: {
          gte: new Date(dateStart),
        },
      };

      if (!!dateEnd) {
        where = {
          ...where,
          end: {
            lte: new Date(dateEnd),
          },
        };
      }
    }

    if (!!cameraID) {
      where = {
        ...where,
        cameraID,
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

    if (showAvailableOnly === 'true') {
      where = {
        ...where,
        generating: false,
      };
    }

    if (!!sortBy) orderBy[sortBy] = sortDirection || 'desc';
    else orderBy['end'] = sortDirection || 'desc';

    return paginate<Timelapse, Prisma.TimelapseFindManyArgs>(
      this.prismaService.timelapse,
      {
        where,
        orderBy,
        include: {
          gateway: {
            select: {
              name: true,
              id: true,
            },
          },
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

  getByJobID(jobID: string) {
    return this.prismaService.timelapse.findFirst({
      where: {
        timelapseJobID: jobID,
      },
      include: {
        gateway: {
          select: {
            name: true,
            id: true,
          },
        },
        camera: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });
  }

  async update(id: string, data: any) {
    const timelapse = await this.prismaService.timelapse.update({
      where: {
        id,
      },
      data,
      include: {
        gateway: {
          select: {
            name: true,
            id: true,
          },
        },
        camera: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    await this.timelapseQueue.add('outgoing', {
      timelapse,
      eventType: 'updated',
    });

    return timelapse;
  }

  async getTimelapseDownloadURL(id: string) {
    const timelapse = await this.prismaService.timelapse.findFirst({
      where: {
        id,
      },
      select: {
        start: true,
        end: true,
        fileName: true,
        cameraID: true,
        generating: true,
        gateway: {
          select: {
            s3Bucket: true,
          },
        },
      },
    });

    if (!timelapse)
      throw new HttpException(
        'Could not find timelapse',
        HttpStatusCode.NotFound,
      );

    if (timelapse.generating)
      throw new HttpException(
        'Timelapse not generated',
        HttpStatusCode.NotFound,
      );

    const fileName = this.getTimelapseFilename(timelapse);

    return {
      url: `https://${timelapse.gateway.s3Bucket}.copcart-cdn.com/${fileName}`,
    };
  }

  async getOldestSnapshotForCameraID(cameraID: string) {
    const snapshots = await this.prismaService.snapshot.findMany({
      where: {
        cameraID,
      },
      orderBy: {
        timestamp: 'asc',
      },
      include: {
        gateway: {
          select: {
            name: true,
            id: true,
          },
        },
        camera: {
          select: {
            name: true,
            id: true,
          },
        },
      },
      take: 1,
    });

    return snapshots[0];
  }

  async getNewestSnapshotForCameraID(cameraID: string) {
    const snapshots = await this.prismaService.snapshot.findMany({
      where: {
        cameraID,
        availableCloud: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        gateway: {
          select: {
            name: true,
            id: true,
          },
        },
        camera: {
          select: {
            name: true,
            id: true,
          },
        },
      },
      take: 1,
    });

    return snapshots[0];
  }

  async getTimelapseBounds(cameraID: string) {
    console.log('getTimelapseBounds', cameraID);
    const oldest = await this.getOldestSnapshotForCameraID(cameraID);
    const newest = await this.getNewestSnapshotForCameraID(cameraID);

    const coefficient = 1000 * 60 * 5;

    let start = new Date();
    let end = new Date();

    if (!!oldest)
      start = new Date(
        Math.round(new Date(oldest.timestamp).getTime() / coefficient) *
          coefficient,
      );
    else {
      console.warn('Missing start');
      start.setDate(start.getDate() - 5);
    }

    if (!!newest)
      end = new Date(
        Math.round(new Date(newest.timestamp).getTime() / coefficient) *
          coefficient,
      );
    else {
      console.warn('Missing end');
      end.setDate(end.getDate());
    }

    return {
      start,
      end,
    };
  }

  async getSnapshotFileNames(
    cameraID: string,
    dateStart?: Date,
    dateEnd?: Date,
    showAnalyzedOnly?: string,
    tags?: string[] | string,
  ) {
    const camera = await this.prismaService.camera.findFirst({
      where: {
        id: cameraID,
      },
      select: {
        gateway: {
          select: {
            s3Bucket: true,
          },
        },
      },
    });

    if (!camera) return;

    const { where, orderBy } = this.snapshotsService.getSnapshotsFilter(
      cameraID,
      undefined,
      'timestamp',
      'asc',
      dateStart,
      dateEnd,
      undefined,
      showAnalyzedOnly,
      tags,
    );

    let snapshots = await this.prismaService.snapshot.findMany({
      where,
      orderBy,
      include: {
        gateway: {
          select: {
            name: true,
            id: true,
          },
        },
        camera: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    if (snapshots.length > 2000) {
      const threshold = Math.round(snapshots.length / 500);

      let counter = 0;
      snapshots = snapshots
        .map((snapshot) => {
          if (counter >= threshold) {
            counter = 0;
            return snapshot;
          }

          counter += 1;
          return null;
        })
        .filter(Boolean);
    }

    snapshots = snapshots.filter(async (snapshot) => {
      const fileName = AppHelpers.getFileKey(
        snapshot.fileName,
        snapshot.cameraID,
        '.jpeg',
      );

      return await this.s3Service.fileExists(fileName, camera.gateway.s3Bucket);
    });

    const fileNames = snapshots.map((snapshot) => {
      return snapshot.fileName;
    });

    let startPreviewURL: string | undefined;
    let endPreviewURL: string | undefined;

    const getValidSnapshot = async (fromStart = true, index: number = 0) => {
      const snapshot = snapshots[index];
      const fileName = AppHelpers.getFileKey(
        snapshot.fileName,
        snapshot.cameraID,
        '.jpeg',
      );

      const isValid = await this.s3Service.fileExists(
        fileName,
        camera.gateway.s3Bucket,
      );
      if (fromStart) {
        if (!isValid) return getValidSnapshot(fromStart, index + 1);
        return snapshot;
      } else {
        if (!isValid) return getValidSnapshot(fromStart, index - 1);
        return snapshot;
      }
    };

    if (snapshots.length > 0) {
      const firstSnapshot = await getValidSnapshot();
      const lastSnapshot = await getValidSnapshot(false, snapshots.length - 1);

      startPreviewURL = await this.snapshotsService
        .getSnapshotDownloadURL(firstSnapshot.id, false)
        .then((response) => response.url);

      endPreviewURL = await this.snapshotsService
        .getSnapshotDownloadURL(lastSnapshot.id, false)
        .then((response) => response.url);
    }

    return {
      fileNames,
      startPreviewURL,
      endPreviewURL,
    };
  }

  private getTimelapseFilename(timelapse: {
    cameraID: string;
    fileName: string;
  }) {
    return `${timelapse.cameraID}/timelapses/${timelapse.fileName}`;
  }
}

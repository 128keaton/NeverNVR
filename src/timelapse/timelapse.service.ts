import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { createPaginator } from 'prisma-pagination';
import { Prisma, Timelapse } from '@prisma/client';
import { VideoAnalyticsService } from '../video-analytics/video-analytics.service';
import { HttpStatusCode } from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TimelapseService {
  constructor(
    private prismaService: PrismaService,
    private videoAnalyticsService: VideoAnalyticsService,
  ) {}

  async createTimelapse(
    fileNames: string[],
    cameraID: string,
    start: Date,
    end: Date,
  ) {
    const camera = await this.prismaService.camera.findFirst({
      where: {
        id: cameraID,
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

    const timelapseJobID = await firstValueFrom(
      this.videoAnalyticsService.createTimelapse(
        fileNames,
        cameraID,
        camera.gateway.s3Bucket,
        start,
        end,
      ),
    );

    return this.prismaService.timelapse.create({
      data: {
        camera: {
          connect: {
            id: cameraID,
          },
        },
        gateway: {
          connect: {
            id: camera.gateway.id,
          },
        },
        start,
        end,
        timelapseJobID,
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
              },
            },
          },
        ],
      };
    }

    if (!!dateStart) {
      where = {
        ...where,
        start: {
          gte: dateStart,
        },
      };

      if (!!dateEnd) {
        where = {
          ...where,
          end: {
            lte: dateEnd,
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
}

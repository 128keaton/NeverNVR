import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { createPaginator } from 'prisma-pagination';
import { Prisma, Timelapse } from '@prisma/client';
import { VideoAnalyticsService } from '../video-analytics/video-analytics.service';
import { HttpStatusCode } from 'axios';
import { firstValueFrom } from 'rxjs';
import { TimelapseCreate } from './types';

@Injectable()
export class TimelapseService {
  constructor(
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

    const timelapseJobID = await firstValueFrom(
      this.videoAnalyticsService.createTimelapse(
        request.fileNames,
        request.cameraID,
        camera.gateway.s3Bucket,
        start,
        end,
      ),
    );

    return this.prismaService.timelapse.create({
      data: {
        start: request.start,
        end: request.end,
        timelapseJobID,
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

  update(id: string, data: any) {
    return this.prismaService.timelapse.update({
      where: {
        id
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
    })
  }
}

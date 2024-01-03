import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { S3Service } from '../services/s3/s3.service';
import { Clip, ClipEvent } from './type';
import { ClipFormat, Prisma } from '@prisma/client';
import { createPaginator } from 'prisma-pagination';
import { AppHelpers } from '../app.helpers';
import { HttpStatusCode } from 'axios';
import { lastValueFrom, Subject } from 'rxjs';
import { VideoAnalyticsService } from '../video-analytics/video-analytics.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ClipsService {
  private _clipEvents = new Subject<ClipEvent>();
  private logger = new Logger(ClipsService.name);

  get clipEvents() {
    return this._clipEvents.asObservable();
  }

  constructor(
    private s3Service: S3Service,
    private prismaService: PrismaService,
    private videoAnalyticsService: VideoAnalyticsService,
    @InjectQueue('clips') private clipQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async updateAnalyzingClips() {
    const clips = await this.prismaService.clip.findMany({
      where: {
        analyzing: true,
      },
    });

    for (const clip of clips) {
      const now = new Date();
      const FIVE_MIN = 5 * 60 * 1000;

      if (!clip.analyzeStart) {
        await this.update(clip.id, { analyzeStart: new Date() });
      } else if (
        now.getDate() - new Date(clip.analyzeStart).getDate() > FIVE_MIN &&
        !!clip.analyticsJobID
      ) {
        const job = await lastValueFrom(
          this.videoAnalyticsService.checkJobStatus(clip.analyticsJobID),
        );

        if (job.stalled) {
          await this.update(
            clip.id,
            { analyzing: false },
            clip.cameraID,
            clip.gatewayID,
          );
        } else if (job.files_processed.includes(clip.fileName)) {
          this.videoAnalyticsService.handleJobFileProcessed(clip.fileName, job);
        }
      }
    }
  }

  getClip(id: string) {
    return this.prismaService.clip.findFirst({
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

  async delete(id: string, emitLocal = true) {
    const deleted = await this.prismaService.clip.delete({
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

    if (!deleted) return deleted;

    // Delete from S3
    const fileKey = AppHelpers.getFileKey(
      deleted.fileName,
      deleted.cameraID,
      '.mp4',
    );

    if (deleted.availableCloud)
      await this.s3Service.deleteFile(fileKey, deleted.gateway.s3Bucket);

    if (emitLocal)
      await this.clipQueue.add('outgoing', {
        eventType: 'deleted',
        clip: deleted,
        cameraID: deleted.cameraID,
      });

    this._clipEvents.next({
      eventType: 'deleted',
      clip: deleted,
      cameraID: deleted.cameraID,
    });

    return deleted;
  }

  getByAnalyticsJobID(analyticsJobID: string) {
    return this.prismaService.clip.findFirst({
      where: {
        analyticsJobID,
      },
    });
  }

  async create(create: Clip, cameraID: string, emitLocal = true) {
    const camera = await this.prismaService.camera.findFirst({
      where: {
        id: cameraID,
      },
      select: {
        timezone: true,
        deleteClipAfter: true,
        id: true,
      },
    });

    let analyticsJobID: string | undefined;
    if (create.availableCloud) {
      const gateway = await this.prismaService.gateway.findFirst({
        where: {
          id: create.gatewayID,
        },
        select: {
          s3Bucket: true,
        },
      });

      analyticsJobID = await lastValueFrom(
        this.videoAnalyticsService.classifyVideoClip(
          create.fileName,
          cameraID,
          gateway.s3Bucket,
        ),
      );
    }

    const clip = await this.prismaService.clip
      .create({
        data: {
          id: create.id,
          start: create.start,
          fileName: create.fileName,
          fileSize: create.fileSize,
          duration: create.duration,
          end: create.end,
          format: create.format,
          width: create.width,
          height: create.height,
          timezone: camera.timezone,
          availableLocally: create.availableLocally,
          availableCloud: create.availableCloud,
          analyticsJobID,
          camera: {
            connect: {
              id: camera.id,
            },
          },
          gateway: {
            connect: {
              id: create.gatewayID,
            },
          },
        },
        include: {
          gateway: {
            select: {
              name: true,
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
        return err;
      });

    if (emitLocal)
      await this.clipQueue.add('outgoing', {
        eventType: 'created',
        clip,
        cameraID: clip.cameraID,
      });

    this._clipEvents.next({
      eventType: 'created',
      clip,
      cameraID: clip.cameraID,
    });

    return clip;
  }

  async update(
    id: string,
    clip: {
      fileName?: string;
      fileSize?: number;
      width?: number;
      height?: number;
      duration?: number;
      format?: ClipFormat;
      start?: Date;
      end?: Date;
      processing?: boolean;
      availableLocally?: boolean;
      availableCloud?: boolean;
      analyticsJobID?: string;
      analyzedFileName?: string;
      analyzed?: boolean;
      analyzing?: boolean;
      analyzeStart?: Date;
      analyzeEnd?: Date;
      primaryTag?: string;
      tags?: string[];
    },
    cameraID?: string,
    gatewayID?: string,
    emitLocal = true,
  ) {
    const existingClip = await this.prismaService.clip.findFirst({
      where: {
        id,
      },
    });

    if (!existingClip)
      return this.create(
        {
          gatewayID,
          id,
          duration: clip.duration,
          fileName: clip.fileName,
          fileSize: clip.fileSize,
          width: clip.width,
          height: clip.height,
          format: clip.format,
          start: clip.start,
          end: clip.end,
          availableLocally: clip.availableLocally,
          availableCloud: clip.availableCloud,
          analyticsJobID: clip.analyticsJobID,
          analyzedFileName: clip.analyzedFileName,
          analyzed: clip.analyzed,
          primaryTag: clip.primaryTag,
          tags: clip.tags,
        },
        cameraID,
      );

    const updatedClip = await this.prismaService.clip.update({
      where: {
        id,
      },
      data: {
        duration: clip.duration,
        fileName: clip.fileName,
        fileSize: clip.fileSize,
        width: clip.width,
        height: clip.height,
        format: clip.format,
        start: clip.start,
        end: clip.end,
        availableLocally: clip.availableLocally,
        availableCloud: clip.availableCloud,
        analyticsJobID: clip.analyticsJobID,
        analyzedFileName: clip.analyzedFileName,
        analyzed: clip.analyzed,
        analyzing: clip.analyzing,
        analyzeStart: clip.analyzeStart,
        analyzeEnd: clip.analyzeEnd,
        primaryTag: clip.primaryTag,
        tags: clip.tags,
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

    if (emitLocal)
      await this.clipQueue.add('outgoing', {
        eventType: 'updated',
        clip: updatedClip,
        cameraID: updatedClip.cameraID,
        gatewayID: updatedClip.gatewayID,
      });

    this._clipEvents.next({
      eventType: 'updated',
      clip: updatedClip,
      cameraID: updatedClip.cameraID,
    });
  }

  getClips(
    cameraID?: string,
    pageSize?: number,
    pageNumber?: number,
    search?: string,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc' | '',
    dateStart?: Date,
    dateEnd?: Date,
    gatewayID?: string,
    showAnalyzedOnly?: string,
    tags?: string[] | string,
  ) {
    const paginate = createPaginator({ perPage: pageSize || 40 });

    const orderBy: Prisma.ClipOrderByWithRelationInput = {};
    let where: Prisma.ClipWhereInput = {};

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
          {
            primaryTag: {
              contains: search,
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
      where = {
        ...where,
        gatewayID,
      };
    }

    if (showAnalyzedOnly === 'true') {
      where = {
        ...where,
        analyzed: true,
      };
    }

    where = AppHelpers.handleTagsFilter(tags, where);

    if (!!sortBy) orderBy[sortBy] = sortDirection || 'desc';
    else orderBy['end'] = sortDirection || 'desc';

    return paginate<Clip, Prisma.ClipFindManyArgs>(
      this.prismaService.clip,
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

  async getVideoClip(id: string) {
    const clip = await this.prismaService.clip.findFirst({
      where: {
        id,
      },
      select: {
        fileName: true,
        availableLocally: true,
        availableCloud: true,
        cameraID: true,
        gateway: {
          select: {
            s3Bucket: true,
          },
        },
      },
    });

    // Download from S3
    if (clip.availableCloud) {
      const fileKey = AppHelpers.getFileKey(
        clip.fileName,
        clip.cameraID,
        '.mp4',
      );

      return this.s3Service.getFile(fileKey, clip.gateway.s3Bucket);
    }

    throw new HttpException(
      'Clip is not in the cloud',
      HttpStatusCode.NotFound,
    );
  }

  async getClipDownloadURL(id: string, analyzed: boolean) {
    const clip = await this.prismaService.clip.findFirst({
      where: {
        id,
      },
      select: {
        fileName: true,
        analyzedFileName: true,
        availableCloud: true,
        cameraID: true,
        gateway: {
          select: {
            s3Bucket: true,
          },
        },
      },
    });

    if (!clip)
      throw new HttpException('Could not find clip', HttpStatusCode.NotFound);

    if (!clip.availableCloud)
      throw new HttpException('Clip not uploaded', HttpStatusCode.NotFound);

    if (!clip.gateway)
      throw new HttpException(
        'Clip not associated with gateway',
        HttpStatusCode.NotFound,
      );

    if (!clip.analyzedFileName && analyzed === true)
      throw new HttpException(
        'Clip has not been analyzed',
        HttpStatusCode.BadRequest,
      );

    const fileKey = AppHelpers.getFileKey(
      analyzed === true ? clip.analyzedFileName : clip.fileName,
      clip.cameraID,
      '.mp4',
    );

    return this.s3Service.getFileURL(fileKey, clip.gateway.s3Bucket);
  }
}

import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { S3Service } from '../services/s3/s3.service';
import { Clip, ClipCreate, ClipEvent, ClipUpdate } from './type';
import { Prisma } from '@prisma/client';
import { createPaginator } from 'prisma-pagination';
import { AppHelpers } from '../app.helpers';
import { AxiosRequestConfig, HttpStatusCode } from 'axios';
import { lastValueFrom, map, ReplaySubject } from 'rxjs';
import { VideoAnalyticsService } from '../video-analytics/video-analytics.service';
import { Interval } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class ClipsService {
  private _clipEvents = new ReplaySubject<ClipEvent>();
  private logger = new Logger(ClipsService.name);

  get clipEvents() {
    return this._clipEvents.asObservable();
  }

  constructor(
    private httpService: HttpService,
    private s3Service: S3Service,
    private prismaService: PrismaService,
    private videoAnalyticsService: VideoAnalyticsService,
    @InjectQueue('clips') private clipQueue: Queue,
  ) {}

  @Interval(120 * 1000)
  async updateAnalyzingClips() {
    const clips = await this.prismaService.clip.findMany({
      where: {
        analyzing: true,
      },
    });

    this.logger.verbose(
      `Updating all clips that are being analyzed ${clips.length} in total`,
    );

    for (const clip of clips) {
      const now = new Date();
      const FIVE_MINUTES = 5 * 60 * 1000;
      const FIVE_HOURS = 5 * 60 * 1000 * 60;

      if (!clip.analyzeStart) {
        this.logger.debug('No analyze start on clip');
        await this.update(clip.id, { analyzeStart: new Date() });
      } else if (
        now.getDate() - new Date(clip.analyzeStart).getDate() > FIVE_MINUTES &&
        now.getDate() - new Date(clip.analyzeStart).getDate() < FIVE_HOURS &&
        !!clip.analyticsJobID
      ) {
        const job = await lastValueFrom(
          this.videoAnalyticsService.checkJobStatus(clip.analyticsJobID),
        );

        this.logger.verbose(job);
        if (job.stalled || job.status === 'DONE' || job.status === 'ERROR') {
          await this.update(
            clip.id,
            { analyzing: false, analyzeEnd: new Date() },
            clip.cameraID,
            clip.gatewayID,
          );
        } else if (job.files_processed.includes(clip.fileName)) {
          this.videoAnalyticsService.handleJobFileProcessed(clip.fileName, job);
        }
      } else if (
        now.getDate() - new Date(clip.analyzeStart).getMilliseconds() >=
          FIVE_HOURS &&
        !!clip.analyticsJobID
      ) {
        await this.update(
          clip.id,
          { analyzing: false, analyzeEnd: new Date() },
          clip.cameraID,
          clip.gatewayID,
        );
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
            id: true,
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

  async create(create: ClipCreate, cameraID: string, emitLocal = true) {
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

    if (!camera)
      throw new HttpException(
        `Cannot find camera for ID ${cameraID}`,
        HttpStatusCode.BadRequest,
      );

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

    const clipWithURL = {
      ...clip,
      url: this.getClipURL(clip),
    };

    if (emitLocal)
      await this.clipQueue.add('outgoing', {
        eventType: 'created',
        clipWithURL,
        cameraID: clip.cameraID,
      });

    this._clipEvents.next({
      eventType: 'created',
      clip: clipWithURL,
      cameraID: clip.cameraID,
    });

    return clipWithURL;
  }

  async update(
    id: string,
    clip: ClipUpdate,
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
      ).catch((err) => {
        this.logger.log('Could not create clip:');
        this.logger.log(err);
        return null;
      });

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

    const clipWithURL = {
      ...updatedClip,
      url: this.getClipURL(updatedClip),
    };

    if (emitLocal)
      await this.clipQueue.add('outgoing', {
        eventType: 'updated',
        clip: clipWithURL,
        cameraID: clipWithURL.cameraID,
        gatewayID: clipWithURL.gatewayID,
      });

    this._clipEvents.next({
      eventType: 'updated',
      clip: clipWithURL,
      cameraID: clipWithURL.cameraID,
    });

    return clipWithURL;
  }

  async getClips(
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
                mode: 'insensitive',
              },
            },
          },
          {
            primaryTag: {
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
        const gatewayIDs = gatewayID.split(',').filter((id) => id.length);
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

    if (showAnalyzedOnly === 'true') {
      where = {
        ...where,
        analyzed: true,
      };
    }

    where = AppHelpers.handleTagsFilter(tags, where);

    if (!!sortBy) orderBy[sortBy] = sortDirection || 'desc';
    else orderBy['end'] = sortDirection || 'desc';

    const paginationResponse = await paginate<Clip, Prisma.ClipFindManyArgs>(
      this.prismaService.clip,
      {
        where,
        orderBy,
        include: {
          gateway: {
            select: {
              name: true,
              id: true,
              s3Bucket: true,
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

    paginationResponse.data = paginationResponse.data.map((clip) => {
      return {
        ...clip,
        url: this.getClipURL(clip),
      };
    });

    return paginationResponse;
  }

  async requestClips(
    gatewayID: string,
    request: { cameraID?: string; dateStart?: Date; dateEnd?: Date },
  ) {
    const gateway = await this.prismaService.gateway.findFirst({
      where: {
        id: gatewayID,
      },
      select: {
        connectionToken: true,
        connectionURL: true,
      },
    });

    if (!gateway)
      throw new HttpException(
        `Cannot find gateway for ID ${gatewayID}`,
        HttpStatusCode.BadRequest,
      );

    return lastValueFrom(
      this.httpService
        .post(
          `${gateway.connectionURL}/api/clips/request`,
          request,
          this.getGatewayConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data)),
    );
  }

  async uploadClips(gatewayID: string, clips: string[]) {
    const gateway = await this.prismaService.gateway.findFirst({
      where: {
        id: gatewayID,
      },
      select: {
        connectionToken: true,
        connectionURL: true,
      },
    });

    if (!gateway)
      throw new HttpException(
        `Cannot find gateway for ID ${gatewayID}`,
        HttpStatusCode.BadRequest,
      );

    return lastValueFrom(
      this.httpService
        .post(
          `${gateway.connectionURL}/api/clips/upload`,
          { clips },
          this.getGatewayConfig(gateway.connectionToken),
        )
        .pipe(map((response) => response.data)),
    );
  }

  async requestClipUpload(id: string) {
    const clip = await this.prismaService.clip.findFirst({
      where: {
        id,
      },
      select: {
        gatewayID: true,
        id: true,
      },
    });

    return this.uploadClips(clip.gatewayID, [clip.id]);
  }

  async getClipsList(clipIDs: string[], availableCloud?: boolean) {
    const clips = await this.prismaService.clip.findMany({
      where: {
        id: {
          in: clipIDs,
        },
        availableCloud,
      },
      include: {
        gateway: {
          select: {
            name: true,
            id: true,
            s3Bucket: true,
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

    return clips.map((clip) => {
      return {
        ...clip,
        url: this.getClipURL(clip),
      };
    });
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
        camera: {
          select: {
            id: true,
          },
        },
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

    return {
      url: this.getClipURL(clip, analyzed),
    };
  }

  private getClipURL(
    clip: {
      gateway: { s3Bucket: string };
      fileName: string;
      camera: { id?: string };
      cameraID?: string;
      analyzedFileName?: string;
    },
    analyzed: boolean = false,
  ) {
    const fileName =
      clip.analyzedFileName && analyzed ? clip.analyzedFileName : clip.fileName;
    const fileKey = AppHelpers.getFileKey(
      fileName,
      clip.camera.id || clip.cameraID,
      '.mp4',
    );

    return `https://${clip.gateway.s3Bucket}.copcart-cdn.com/${fileKey}`;
  }

  private getGatewayConfig(apiKey: string): AxiosRequestConfig {
    return {
      headers: {
        'api-key': apiKey,
      },
    };
  }
}

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
import {
  catchError,
  lastValueFrom,
  map,
  of,
  ReplaySubject,
  switchMap,
} from 'rxjs';
import { VideoAnalyticsService } from '../video-analytics/video-analytics.service';
import { Interval } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
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
        type: 'recording',
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

  async getClip(id: string) {
    const clip = await this.prismaService.clip.findFirst({
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

    const snapshotMinDate = new Date(clip.start);
    snapshotMinDate.setMinutes(snapshotMinDate.getMinutes() - 1);

    const snapshotMaxDate = new Date(clip.end);
    snapshotMaxDate.setMinutes(snapshotMaxDate.getMinutes() + 1);

    const potentialSnapshots = await this.prismaService.snapshot.findMany({
      where: {
        cameraID: clip.camera.id,
        AND: [
          {
            timestamp: {
              gte: snapshotMinDate,
            },
          },
          {
            timestamp: {
              lte: snapshotMaxDate,
            },
          },
        ],
      },
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        gateway: {
          select: {
            s3Bucket: true,
          },
        },
      },
    });

    let snapshot = potentialSnapshots.find((snapshot) => {
      const snapshotDate = new Date(snapshot.timestamp);
      const clipDate = new Date(clip.start);

      return (
        snapshotDate.getFullYear() === clipDate.getFullYear() &&
        snapshotDate.getMonth() === clipDate.getMonth() &&
        snapshotDate.getDate() === clipDate.getDate() &&
        snapshotDate.getHours() == clipDate.getHours() &&
        snapshotDate.getMinutes() === clipDate.getMinutes()
      );
    });

    if (!snapshot) snapshot = potentialSnapshots[0];

    const getPreviewURL = (snapshot: {
      cameraID: string;
      fileName: string;
      gateway: { s3Bucket: string };
    }) => {
      const fileKey = AppHelpers.getFileKey(
        snapshot.fileName,
        snapshot.cameraID,
        '.jpeg',
      );

      return `https://${snapshot.gateway.s3Bucket}.copcart-cdn.com/${fileKey}`;
    };

    if (!!snapshot) {
      return {
        ...clip,
        previewURL: getPreviewURL(snapshot),
      };
    }

    return clip;
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

  getByGenerationJobID(generationJobID: string) {
    return this.prismaService.clip.findFirst({
      where: {
        generationJobID,
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
              s3Bucket: true,
              id: true,
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

    if (!existingClip) {
      this.logger.warn(`Could not find clip with ID ${id}`);
      return;
    }

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
        generated: clip.generated,
        generateStart: clip.generateStart,
        generateEnd: clip.generateEnd,
        generationJobID: clip.generationJobID,
        requested: clip.requested,
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
    showAvailableOnly?: string,
    tags?: string[] | string,
  ) {
    const paginate = createPaginator({ perPage: pageSize || 40 });

    const orderBy: Prisma.ClipOrderByWithRelationInput = {};
    const orderByPreview: Prisma.SnapshotOrderByWithRelationInput = {};
    let where: Prisma.ClipWhereInput = {};
    let previewWhere: Prisma.SnapshotWhereInput = {
      availableCloud: true,
    };

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

      previewWhere = {
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

        const previewDateStart = new Date(dateStart);
        previewDateStart.setMinutes(previewDateStart.getMinutes() - 1);

        const previewDateEnd = new Date(dateEnd);
        previewDateEnd.setMinutes(previewDateEnd.getMinutes() + 1);

        previewWhere = {
          ...previewWhere,
          AND: [
            {
              timestamp: {
                gte: previewDateStart,
              },
            },
            {
              timestamp: {
                lte: previewDateEnd,
              },
            },
          ],
        };
      } else {
        previewWhere = {
          ...previewWhere,
          timestamp: {
            gte: new Date(dateStart),
          },
        };
      }
    }

    if (!!cameraID) {
      where = {
        ...where,
        cameraID,
      };

      previewWhere = {
        ...previewWhere,
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

        previewWhere = {
          ...previewWhere,
          gatewayID: {
            in: gatewayIDs,
          },
        };
      } else {
        where = {
          ...where,
          gatewayID,
        };

        previewWhere = {
          ...previewWhere,
          gatewayID,
        };
      }
    }

    if (showAvailableOnly === 'true') {
      where = {
        ...where,
        availableCloud: true,
      };
    }

    where = AppHelpers.handleTagsFilter(tags, where);

    if (!!sortBy) {
      orderBy[sortBy] = sortDirection || 'desc';

      if (sortBy === 'start' || sortBy === 'end')
        orderByPreview['timestamp'] = sortDirection || 'desc';
    } else {
      orderBy['end'] = sortDirection || 'desc';
      orderByPreview['timestamp'] = sortDirection || 'desc';
    }

    const previewSnapshotsResponse = await paginate<
      any,
      Prisma.SnapshotFindManyArgs
    >(
      this.prismaService.snapshot,
      {
        where: previewWhere,
        orderBy: orderByPreview,
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

    paginationResponse.data.forEach((clip, index) => {
      const getPreviewURL = (snapshot: {
        cameraID: string;
        fileName: string;
        gateway: { s3Bucket: string };
      }) => {
        const fileKey = AppHelpers.getFileKey(
          snapshot.fileName,
          snapshot.cameraID,
          '.jpeg',
        );

        return `https://${snapshot.gateway.s3Bucket}.copcart-cdn.com/${fileKey}`;
      };

      const snapshot = previewSnapshotsResponse.data.find((snapshot) => {
        const snapshotDate = new Date(snapshot.timestamp);
        const clipDate = new Date(clip.start);

        return (
          snapshotDate.getFullYear() === clipDate.getFullYear() &&
          snapshotDate.getMonth() === clipDate.getMonth() &&
          snapshotDate.getDate() === clipDate.getDate() &&
          snapshotDate.getHours() == clipDate.getHours() &&
          snapshotDate.getMinutes() === clipDate.getMinutes()
        );
      });

      if (!!snapshot) {
        paginationResponse.data[index] = {
          ...clip,
          previewURL: getPreviewURL(snapshot),
          url: this.getClipURL(clip),
        };
      } else {
        paginationResponse.data[index] = {
          ...clip,
          url: this.getClipURL(clip),
        };
      }
    });

    return paginationResponse;
  }

  async getManyClips(clipIDs: string | string[]) {
    if (!Array.isArray(clipIDs)) clipIDs = clipIDs.split(',');

    const clips = await this.prismaService.clip.findMany({
      where: {
        id: {
          in: clipIDs,
        },
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
      orderBy: {
        end: 'desc',
      },
    });

    return {
      meta: {
        total: clips.length,
      },
      data: clips,
    };
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

    const totalUpdated = await lastValueFrom(
      this.httpService
        .post<{ success: boolean }>(
          `${gateway.connectionURL}/api/clips/upload`,
          { clips },
          this.getGatewayConfig(gateway.connectionToken),
        )
        .pipe(
          map((response) => response.data.success),
          catchError((err) => {
            this.logger.error('Could not request clips to be uploaded:');
            this.logger.error(err);

            return of(false);
          }),
          switchMap((success) => {
            if (success) return this.updateManyRequested(clips);
            else return of(0);
          }),
        ),
    );

    return { totalUpdated };
  }

  async requestClipUpload(id: string) {
    this.logger.verbose(`Request clip upload: ${id}`);
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

  async updateManyRequested(clips: string[]) {
    let totalUpdated = 0;
    for (const clipID of clips) {
      await this.update(clipID, {
        requested: true,
      }).then(() => {
        totalUpdated += 1;
      });
    }

    return totalUpdated;
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

  async createGeneratedClip(request: { clipIDs: string[]; cameraID: string }) {
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

    const clips = await this.prismaService.clip.findMany({
      where: {
        id: {
          in: request.clipIDs,
        },
      },
      select: {
        fileName: true,
      },
    });

    const jobResponse = await lastValueFrom(
      this.videoAnalyticsService.concatVideoClips(
        clips.map((clip) => clip.fileName),
        request.cameraID,
        camera.gateway.s3Bucket,
      ),
    );

    let generationJobID = undefined;
    if (jobResponse.id) {
      generationJobID = jobResponse.id;
    }

    return this.prismaService.clip.create({
      data: {
        id: uuidv4(),
        type: 'generated',
        generateStart: new Date(jobResponse.start_time),
        generated: false,
        generationJobID,
        fileName: 'unknown',
        fileSize: 0,
        duration: 0,
        width: 0,
        height: 0,
        availableCloud: false,
        availableLocally: false,
        gateway: {
          connect: {
            id: camera.gateway.id,
          },
        },
        camera: {
          connect: {
            id: request.cameraID,
          },
        },
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

    let fileKey = '';

    if (fileName.includes('alarm')) {
      fileKey = AppHelpers.getGeneratedAlarmBucketDirectory(
        fileName,
        clip.camera.id || clip.cameraID,
      );
    } else {
      fileKey = AppHelpers.getFileKey(
        fileName,
        clip.camera.id || clip.cameraID,
        '.mp4',
      );
    }

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

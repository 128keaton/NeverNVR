import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { SnapshotCreate, SnapshotEvent, SnapshotUpload } from './types';
import { HttpStatusCode } from 'axios';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createPaginator } from 'prisma-pagination';
import { Prisma, Snapshot } from '@prisma/client';
import { S3Service } from '../services/s3/s3.service';
import { AppHelpers } from '../app.helpers';
import { lastValueFrom, Subject } from 'rxjs';
import { VideoAnalyticsService } from '../video-analytics/video-analytics.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SnapshotsService {
  private _snapshotEvents = new Subject<SnapshotEvent>();
  private logger = new Logger(SnapshotsService.name);

  get snapshotEvents() {
    return this._snapshotEvents.asObservable();
  }

  constructor(
    private prismaService: PrismaService,
    private s3Service: S3Service,
    private videoAnalyticsService: VideoAnalyticsService,
    @InjectQueue('snapshots') private snapshotsQueue: Queue<SnapshotEvent>,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async updateAnalyzingSnapshots() {
    const snapshots = await this.prismaService.snapshot.findMany({
      where: {
        analyzing: true,
      },
    });

    for (const snapshot of snapshots) {
      const now = new Date();
      const FIVE_MIN = 5 * 60 * 1000;

      if (!snapshot.analyzeStart) {
        await this.update(snapshot.id, { analyzeStart: new Date() });
      } else if (
        now.getDate() - new Date(snapshot.analyzeStart).getDate() > FIVE_MIN &&
        !!snapshot.analyticsJobID
      ) {
        const job = await lastValueFrom(
          this.videoAnalyticsService.checkJobStatus(snapshot.analyticsJobID),
        );

        if (job.stalled) {
          await this.update(snapshot.id, { analyzing: false });
        } else if (job.files_processed.includes(snapshot.fileName)) {
          this.videoAnalyticsService.handleJobFileProcessed(
            snapshot.fileName,
            job,
          );
        }
      }
    }
  }

  async uploadAndCreate(upload: SnapshotUpload, file: Express.Multer.File) {
    if (!file)
      throw new HttpException('Invalid request', HttpStatusCode.BadRequest);

    this.logger.verbose(`Uploading ${file.originalname} to S3`);
    this.logger.debug(`Upload parameters: ${JSON.stringify(upload)}`);

    const camera = await this.prismaService.camera.findFirst({
      where: {
        id: upload.cameraID,
      },
      select: {
        timezone: true,
        deleteSnapshotAfter: true,
        id: true,
        name: true,
      },
    });

    const gateway = await this.prismaService.gateway.findFirst({
      where: {
        id: upload.gatewayID,
      },
      select: {
        s3Bucket: true,
      },
    });

    if (!camera)
      throw new HttpException('Could not find camera', HttpStatusCode.NotFound);

    const baseDirectory = upload.timestamp.split('T')[0];
    const cloudFileName = `${baseDirectory}/${camera.id}/${file.originalname}`;

    const availableCloud = await this.s3Service.uploadFile(
      cloudFileName,
      gateway.s3Bucket,
      file,
    );

    if (!availableCloud)
      throw new HttpException(
        'Could not upload to S3',
        HttpStatusCode.NotFound,
      );

    const analyticsJobID = await lastValueFrom(
      this.videoAnalyticsService.classifyImage(
        file.originalname,
        camera.id,
        gateway.s3Bucket,
      ),
    );

    const snapshot = await this.prismaService.snapshot.create({
      data: {
        id: uuidv4(),
        availableCloud,
        availableLocally: false,
        timezone: upload.timezone || camera.timezone,
        fileName: file.originalname,
        fileSize: parseInt(upload.fileSize),
        width: parseInt(upload.width),
        height: parseInt(upload.height),
        timestamp: new Date(upload.timestamp),
        analyticsJobID,
        gateway: {
          connect: {
            id: upload.gatewayID,
          },
        },
        camera: {
          connect: {
            id: camera.id,
          },
        },
      },
      include: {
        camera: {
          select: {
            name: true,
          },
        },
        gateway: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!snapshot) return snapshot;

    await this.snapshotsQueue.add('outgoing', {
      eventType: 'created',
      snapshot,
      create: upload,
      cameraID: camera.id,
    });

    this._snapshotEvents.next({
      create: upload,
      snapshot,
      eventType: 'created',
      cameraID: camera.id,
    });

    return snapshot;
  }

  async create(create: SnapshotCreate, emitLocal = true) {
    const camera = await this.prismaService.camera.findFirst({
      where: {
        id: create.cameraID,
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
        this.videoAnalyticsService.classifyImage(
          create.fileName,
          camera.id,
          gateway.s3Bucket,
        ),
      );
    }

    const snapshot = await this.prismaService.snapshot.create({
      data: {
        id: create.id,
        timezone: create.timezone || camera.timezone,
        fileName: create.fileName,
        fileSize: create.fileSize,
        width: create.width,
        height: create.height,
        timestamp: create.timestamp,
        analyticsJobID,
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
      include: {
        camera: {
          select: {
            name: true,
          },
        },
        gateway: {
          select: {
            name: true,
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
        cameraID: camera.id,
      });

    this._snapshotEvents.next({
      create,
      snapshot,
      eventType: 'created',
      cameraID: camera.id,
    });

    return snapshot;
  }

  getSnapshots(
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

    const orderBy = {};
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

    if (!!dateStart && !dateEnd) {
      where = {
        ...where,
        timestamp: {
          gte: dateStart,
        },
      };
    }

    if (!!dateStart && !!dateEnd) {
      where = {
        ...where,
        AND: [
          {
            timestamp: {
              gte: dateStart,
            },
          },
          {
            timestamp: {
              lte: dateEnd,
            },
          },
        ],
      };
    }

    where = AppHelpers.handleTagsFilter(tags, where);

    if (!!sortBy) orderBy[sortBy] = sortDirection || 'desc';
    else orderBy['timestamp'] = sortDirection || 'desc';

    return paginate<Snapshot, Prisma.SnapshotFindManyArgs>(
      this.prismaService.snapshot,
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

  async update(id: string, data: any, emitLocal = true) {
    const snapshot = await this.prismaService.snapshot.update({
      where: {
        id,
      },
      data,
      include: {
        camera: {
          select: {
            name: true,
          },
        },
        gateway: {
          select: {
            name: true,
          },
        },
      },
    });

    if (emitLocal)
      await this.snapshotsQueue.add('outgoing', {
        eventType: 'updated',
        snapshot,
      });

    this._snapshotEvents.next({
      snapshot,
      eventType: 'updated',
      cameraID: snapshot.cameraID,
    });

    return snapshot;
  }

  getSnapshot(id: string) {
    return this.prismaService.snapshot.findFirst({
      where: {
        id,
      },
      include: {
        gateway: {
          select: {
            id: true,
            name: true,
          },
        },
        camera: {
          select: {
            id: true,
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
      deleted.cameraID,
      '.jpeg',
    );

    await this.s3Service.deleteFile(fileKey, deleted.gateway.s3Bucket);

    if (emitLocal)
      await this.snapshotsQueue.add('outgoing', {
        eventType: 'deleted',
        snapshot: deleted,
        cameraID: deleted.cameraID,
      });

    this._snapshotEvents.next({
      snapshot: deleted,
      eventType: 'deleted',
      cameraID: deleted.cameraID,
    });

    return deleted;
  }

  async getSnapshotDownloadURL(id: string, analyzed = false) {
    const snapshot = await this.prismaService.snapshot.findFirst({
      where: {
        id,
      },
      select: {
        timestamp: true,
        fileName: true,
        availableCloud: true,
        availableLocally: true,
        analyzedFileName: true,
        cameraID: true,
        gateway: {
          select: {
            s3Bucket: true,
          },
        },
      },
    });

    if (!snapshot)
      throw new HttpException(
        'Could not find snapshot',
        HttpStatusCode.NotFound,
      );

    if (!snapshot.availableCloud)
      throw new HttpException('Snapshot not uploaded', HttpStatusCode.NotFound);

    if (!snapshot.analyzedFileName && analyzed === true)
      throw new HttpException(
        'Snapshot has not been analyzed',
        HttpStatusCode.NotFound,
      );

    const fileKey = AppHelpers.getFileKey(
      analyzed ? snapshot.analyzedFileName : snapshot.fileName,
      snapshot.cameraID,
      '.jpeg',
    );

    return this.s3Service
      .getFileURL(fileKey, snapshot.gateway.s3Bucket)
      .catch(() => {
        // Fetch using snapshot timestamp instead of parsed filename timestamp
        const timestamp = snapshot.timestamp || new Date();
        const baseDirectory = timestamp.toISOString().split('T')[0];
        const cloudFileName = `${baseDirectory}/${snapshot.cameraID}/${snapshot.fileName}`;

        return this.s3Service.getFileURL(
          cloudFileName,
          snapshot.gateway.s3Bucket,
        );
      });
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

  getByAnalyticsJobID(analyticsJobID: string) {
    return this.prismaService.snapshot.findFirst({
      where: {
        analyticsJobID,
      },
    });
  }
}

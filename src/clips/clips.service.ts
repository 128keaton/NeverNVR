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
import { Subject } from 'rxjs';

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
    @InjectQueue('clips') private clipQueue: Queue,
  ) {}

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
      deleted.camera.name,
      '.mp4',
    );

    if (deleted.availableCloud)
      await this.s3Service.deleteFile(fileKey, deleted.gateway.s3Bucket);

    if (emitLocal)
      await this.clipQueue.add('outgoing', {
        eventType: 'deleted',
        clip: deleted,
        cameraName: deleted.camera.name,
      });

    this._clipEvents.next({
      eventType: 'deleted',
      clip: deleted,
      cameraName: deleted.camera.name,
    });

    return deleted;
  }

  async create(create: Clip, cameraName: string, emitLocal = true) {
    const camera = await this.prismaService.camera.findFirst({
      where: {
        name: cameraName,
      },
      select: {
        timezone: true,
        deleteClipAfter: true,
        id: true,
      },
    });

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

    if (emitLocal)
      await this.clipQueue.add('outgoing', {
        eventType: 'created',
        clip,
        cameraName,
      });

    this._clipEvents.next({
      eventType: 'created',
      clip,
      cameraName: clip.camera.name,
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
    },
  ) {
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

    this._clipEvents.next({
      eventType: 'updated',
      clip: updatedClip,
      cameraName: updatedClip.camera.name,
    });
  }

  getClips(pageSize?: number, pageNumber?: number, search?: string) {
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

    return paginate<Clip, Prisma.ClipFindManyArgs>(
      this.prismaService.clip,
      {
        where,
        orderBy: {
          end: 'desc',
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
      },
      {
        page: pageNumber,
        perPage: pageSize,
      },
    );
  }

  async getClipsByCameraID(cameraID: string) {
    const clips = await this.prismaService.clip.findMany({
      where: {
        cameraID,
      },
      orderBy: {
        end: 'desc',
      },
      select: {
        fileName: true,
        id: true,
        timezone: true,
        fileSize: true,
        width: true,
        height: true,
        duration: true,
        format: true,
        start: true,
        end: true,
        cameraID: true,
        availableCloud: true,
        availableLocally: true,
      },
    });
    return {
      total: clips.length,
      data: clips,
    };
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
        camera: {
          select: {
            name: true,
          },
        },
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
        clip.camera.name,
        '.mp4',
      );

      return this.s3Service.getFile(fileKey, clip.gateway.s3Bucket);
    }

    throw new HttpException(
      'Clip is not in the cloud',
      HttpStatusCode.NotFound,
    );
  }

  async getClipDownloadURL(id: string) {
    const clip = await this.prismaService.clip.findFirst({
      where: {
        id,
      },
      select: {
        fileName: true,
        availableCloud: true,
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

    if (!clip)
      throw new HttpException('Could not find clip', HttpStatusCode.NotFound);

    if (!clip.availableCloud)
      throw new HttpException('Clip not uploaded', HttpStatusCode.NotFound);

    if (!clip.gateway)
      throw new HttpException(
        'Clip not associated with gateway',
        HttpStatusCode.NotFound,
      );

    const fileKey = AppHelpers.getFileKey(
      clip.fileName,
      clip.camera.name,
      '.mp4',
    );

    return this.s3Service.getFileURL(fileKey, clip.gateway.s3Bucket);
  }
}

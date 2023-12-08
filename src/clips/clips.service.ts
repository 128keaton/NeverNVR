import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { S3Service } from '../services/s3/s3.service';
import { Clip } from './type';
import { ClipFormat } from '@prisma/client';

@Injectable()
export class ClipsService {
  private logger = new Logger(ClipsService.name);

  constructor(
    private s3Service: S3Service,
    private prismaService: PrismaService,
    private configService: ConfigService,
    @InjectQueue('clips') private clipQueue: Queue,
  ) {}

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
          deleteAfter: camera.deleteClipAfter,
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

    return clip;
  }

  update(
    id: string,
    clip: {
      deleteAfter?: number;
      fileName?: string;
      fileSize?: number;
      width?: number;
      height?: number;
      duration?: number;
      format?: ClipFormat;
      start?: Date;
      end?: Date;
      processing?: boolean;
      uploaded?: boolean;
    },
  ) {
    return this.prismaService.clip.update({
      where: {
        id,
      },
      data: {
        duration: clip.duration,
        deleteAfter: clip.deleteAfter,
        fileName: clip.fileName,
        fileSize: clip.fileSize,
        width: clip.width,
        height: clip.height,
        format: clip.format,
        start: clip.start,
        end: clip.end,
      },
    });
  }
}

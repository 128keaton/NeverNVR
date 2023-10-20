import { Inject, Injectable, StreamableFile } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigType } from '@nestjs/config';
import clipsConfig from './clips.config';
import * as fs from 'fs';
import { FSWatcher } from 'chokidar';
import { ClipProperties } from './types';
import { ClipFormat } from '@prisma/client';
import { Interval } from '@nestjs/schedule';
import * as path from 'path';

@Injectable()
export class ClipsService {
  constructor(
    private prismaService: PrismaService,
    @InjectQueue('clip') private clipQueue: Queue,
    @Inject(clipsConfig.KEY)
    private config: ConfigType<typeof clipsConfig>,
  ) {
    if (!fs.existsSync(config.storagePath)) fs.mkdirSync(config.storagePath);

    const watcher = new FSWatcher({ ignoreInitial: true });

    watcher.add(config.storagePath);

    watcher.on('add', (path, stats) => {
      if (!stats) return this.clipQueue.add('start', path);
    });

    watcher.on('change', (path) => {
      return this.clipQueue.add('finish', path);
    });

    setTimeout(() => this.checkClips(), 1000);
  }

  getClipsByCameraID(cameraID: string) {
    return this.prismaService.clip.findMany({
      where: {
        cameraID,
        processing: false,
      },
      orderBy: {
        end: 'desc',
      },
      select: {
        id: true,
        timezone: true,
        fileSize: true,
        width: true,
        height: true,
        duration: true,
        format: true,
        start: true,
        end: true,
        deleteAfter: true,
        cameraID: true,
      },
    });
  }

  async getVideoClip(id: string) {
    const clip = await this.prismaService.clip.findFirst({
      where: {
        id,
        processing: false,
      },
      select: {
        fileName: true,
        cameraID: true,
      },
    });

    const file = fs.createReadStream(
      path.join(this.config.storagePath, clip.cameraID, clip.fileName),
    );

    return new StreamableFile(file);
  }

  getByFileNameCameraID(fileName: string, cameraID: string) {
    return this.prismaService.clip.findFirst({
      where: {
        fileName,
        cameraID,
      },
    });
  }

  async create(clip: ClipProperties, cameraID: string) {
    const camera = await this.prismaService.camera.findFirst({
      where: {
        id: cameraID,
      },
      select: {
        timezone: true,
        deleteClipAfter: true,
      },
    });

    return this.prismaService.clip.create({
      data: {
        ...clip,
        timezone: camera.timezone,
        deleteAfter: camera.deleteClipAfter,
        camera: {
          connect: {
            id: cameraID,
          },
        },
      },
    });
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
    },
  ) {
    return this.prismaService.clip.update({
      where: {
        id,
      },
      data: clip,
    });
  }

  async delete(id: string) {
    const deleted = await this.prismaService.clip.delete({
      where: {
        id,
      },
    });

    if (!deleted) return deleted;

    const clipPath = path.join(
      this.config.storagePath,
      deleted.cameraID,
      deleted.fileName,
    );

    if (fs.existsSync(clipPath)) {
      fs.rmSync(clipPath);
    }

    return deleted;
  }

  @Interval('check-clips', 60000)
  async checkClips() {
    const aMinuteAgo = new Date();
    aMinuteAgo.setMinutes(-1);

    const clips = await this.prismaService.clip.findMany({
      where: {
        processing: true,
        start: {
          lt: aMinuteAgo,
        },
      },
    });

    if (!clips.length) return;

    for (const clip of clips) {
      await this.clipQueue.add('update', clip);
    }
  }
}

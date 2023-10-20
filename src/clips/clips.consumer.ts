import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ClipsService } from './clips.service';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { ClipDetails } from './types';
import { Inject, Logger } from '@nestjs/common';
import { Clip, ClipFormat } from '@prisma/client';
import clipsConfig from './clips.config';
import { ConfigType } from '@nestjs/config';
import * as path from 'path';

@Processor('clip')
export class ClipsConsumer {
  private logger = new Logger(ClipsConsumer.name);

  constructor(
    private clipsService: ClipsService,
    @Inject(clipsConfig.KEY)
    private config: ConfigType<typeof clipsConfig>,
  ) {}

  @Process('start')
  async startClipCreation(job: Job<string>) {
    const clipPath = job.data;
    const { cameraID, fileName, stats } = this.getClipInfo(clipPath);
    const start = new Date();

    if (!stats || !cameraID) return;

    const existingClip = await this.clipsService.getByFileNameCameraID(
      fileName,
      cameraID,
    );

    if (!!existingClip) {
      if (Number(existingClip.fileSize) === stats.size) {
        this.logger.warn(
          `Size is EXACTLY the same which is sus, ${existingClip.fileSize} = ${stats.size}`,
        );
      }

      this.logger.error('Existing clip is already being processed');
      return;
    }

    return this.clipsService.create(
      {
        start,
        fileName,
        fileSize: stats.size,
        width: 0,
        height: 0,
        duration: 0,
      },
      cameraID,
    );
  }

  @Process('finish')
  async endClipCreation(job: Job<string>) {
    const clipPath = job.data;
    const { cameraID, fileName, stats } = this.getClipInfo(clipPath);

    const end = new Date();

    const clip = await this.clipsService.getByFileNameCameraID(
      fileName,
      cameraID,
    );

    if (!clip) {
      this.logger.error('Clip to finish does not exist');
      return;
    }

    const clipDetails = await this.getClipDetails(clipPath);

    if (!clipDetails) {
      this.logger.error('Clip details are null, deleting clip');
      return this.clipsService.delete(clip.id);
    }

    return this.clipsService.update(clip.id, {
      end,
      width: clipDetails.width,
      height: clipDetails.height,
      duration: parseFloat(clipDetails.duration || '0'),
      fileSize: stats.size,
      processing: false,
      format: this.getClipFormat(clipDetails, clip.format),
    });
  }

  @Process('update')
  async updateClip(job: Job<Clip>) {
    const clip = job.data;
    const clipPath = path.join(
      this.config.storagePath,
      clip.cameraID,
      clip.fileName,
    );

    this.logger.verbose(`Updating clip at ${clipPath}`);

    const { cameraID, fileName, stats } = this.getClipInfo(clipPath);

    if (!clip || clip.cameraID !== cameraID || clip.fileName !== fileName) {
      this.logger.error('Clip to finish does not exist');
      return;
    }

    // Check for an empty clip
    if (clip.fileSize <= 44 && clip.processing) {
      this.logger.error('Clip is empty, deleting clip');
      return this.clipsService.delete(clip.id);
    }

    let processing;
    let width = clip.width;
    let height = clip.height;
    let duration = clip.duration;
    let format = clip.format;
    let end = clip.end;

    if (Number(clip.fileSize) === stats.size) {
      this.logger.debug(`Updated clip has same file size ${stats.size}`);
      processing = false;
    } else {
      this.logger.debug(`Updated clip has different file size ${stats.size}`);
      processing = true;
    }

    if (!clip.width || !clip.height || !clip.duration) {
      const clipDetails = await this.getClipDetails(clipPath);

      if (!clipDetails && !processing) {
        this.logger.error('Clip details are null, deleting clip');
        return this.clipsService.delete(clip.id);
      }

      width = clipDetails.width;
      height = clipDetails.height;
      duration = parseFloat(clipDetails.duration);
      end = new Date(clip.start);
      processing = false;
      format = this.getClipFormat(clipDetails, format);

      if (duration >= 60 || end.getSeconds() + duration >= 60) {
        const remainingSeconds = duration - 60;
        end.setMinutes(end.getMinutes() + 1);
        end.setSeconds(end.getSeconds() + remainingSeconds);
      } else {
        end.setSeconds(end.getSeconds() + duration);
      }
    }

    return this.clipsService.update(clip.id, {
      fileSize: stats.size,
      width,
      height,
      duration,
      processing,
      end,
      format,
    });
  }

  private getClipDetails(path: string) {
    return new Promise<ClipDetails>((resolve) => {
      let jsonString = '';
      const process = spawn('ffprobe', [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height,duration,codec_name,pix_fmt',
        '-of',
        'json',
        path,
      ]);

      process.stdout.setEncoding('utf-8');
      process.stdout.on('data', (data) => {
        jsonString += data;
      });

      process.on('close', () => {
        if (jsonString.length === 0) {
          resolve(null);
          return;
        }

        const result: {
          programs: any[];
          streams: ClipDetails[];
        } = JSON.parse(jsonString);

        if (!!result && !!result.streams && !!result.streams[0]) {
          this.logger.debug(
            `Clip details: ${JSON.stringify(result.streams[0])}`,
          );
          resolve(result.streams[0]);
        }

        resolve(null);
      });
    });
  }

  private getClipInfo(path: string) {
    const splitClipPath = path.split('/').reverse();
    const cameraID = splitClipPath[1];
    const fileName = splitClipPath[0];
    const stats = fs.statSync(path);

    return { cameraID, fileName, stats };
  }

  private getClipFormat(details: ClipDetails, existingFormat?: ClipFormat) {
    if (!!details.codec_name && details.codec_name === 'hevc') {
      return 'H265';
    } else if (!!details.codec_name) {
      return 'H264';
    }

    return existingFormat;
  }
}

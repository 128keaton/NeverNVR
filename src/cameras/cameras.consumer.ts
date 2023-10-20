import {
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { Job } from 'bull';
import { Camera } from '@prisma/client';
import { CamerasService } from './cameras.service';
import { promise } from 'ping';
import { Inject, Logger } from '@nestjs/common';
import * as fs from 'fs';
import camerasConfig from './cameras.config';
import { ConfigType } from '@nestjs/config';
import { spawn } from 'child_process';
import * as path from 'path';

@Processor('camera')
export class CamerasConsumer {
  private logger = new Logger(CamerasConsumer.name);

  constructor(
    private camerasService: CamerasService,
    @Inject(camerasConfig.KEY)
    private config: ConfigType<typeof camerasConfig>,
  ) {}

  @Process('ping')
  async ping(job: Job<Camera>) {
    const camera = job.data;

    this.logger.verbose(`Pinging ${camera.name || camera.host}`);

    const response = await promise
      .probe(camera.host, { timeout: 5 })
      .catch((err) => {
        this.logger.error(`Could not ping camera`);
        this.logger.error(err);
        return { alive: false };
      });

    this.logger.verbose(
      `Done pinging ${camera.name || camera.host}, alive = ${response.alive}`,
    );

    return response.alive;
  }

  @Process('record')
  async record(job: Job<Camera>) {
    const camera = job.data;

    if (camera.mode !== 'RECORD') {
      this.logger.verbose(
        `Not starting record job on camera ${
          camera.name || camera.host
        } since camera mode is ${camera.mode}`,
      );
      return;
    } else if (!camera.streamURL || !camera.streamURL.length) {
      this.logger.verbose(
        `Not starting record job on camera ${
          camera.name || camera.host
        } since the stream URL is invalid`,
      );
      return;
    }

    await this.camerasService.updateRecording(camera.id, true);

    const segmentTime = camera.segmentTime;

    const args = [
      '-i',
      camera.streamURL,
      '-c',
      'copy',
      '-map',
      '0',
      '-f',
      'segment',
      '-segment_atclocktime',
      '1',
      '-segment_time',
      `${segmentTime}`,
      '-segment_format',
      'mp4',
      '-strftime',
      '1',
      `%Y%m%dT%H%M%SZ.mp4`,
    ];

    // frame= 2350 fps= 30 q=-1.0 size=N/A time=00:01:18.30 bitrate=N/A speed=1.01x

    const frameMatcher = /frame=\s*\d*/gm;
    const fpsMatcher = /fps=\s*\d*/gm;

    const processStats = (frameArray: string[], fpsArray: string[]) => {
      const stats = {
        fps: 0,
        frame: 0,
      };

      if (!!frameArray) {
        const frame = frameArray[0];

        if (!!frame) stats.frame = parseInt(frame.replace('frame=', ''));
      }

      if (!!fpsArray) {
        const fps = fpsArray[0];

        if (!!fps) stats.fps = parseInt(fps.replace('fps=', ''));
      }

      if (stats.frame !== 0 && stats.fps !== 0) {
        this.logger.debug(JSON.stringify(stats));
      }
    };

    const storagePath = path.join(this.config.clipStoragePath, camera.id);

    if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath);

    const process = spawn('ffmpeg', args, { cwd: storagePath });

    process.stderr.setEncoding('utf-8');
    process.stderr.on('data', (chunk: string) => {
      const frame = frameMatcher.exec(chunk);
      const fps = fpsMatcher.exec(chunk);

      processStats(frame, fps);
    });

    process.on('close', (code) => {
      this.logger.verbose(`Recording process ended with ${code}`);

      return this.camerasService.updateRecording(camera.id, false).then(() => {
        return this.camerasService.updateRecordingPID(camera.id, null);
      });
    });

    await this.camerasService.updateRecordingPID(camera.id, process.pid);

    process.unref();

    return true;
  }

  @OnQueueFailed()
  async handleFailure(job: Job<Camera>, err: Error) {
    this.logger.warn(`handleFailure: ${err}`);

    const camera = job.data;

    if (job.name === 'record') {
      await this.camerasService.updateRecording(camera.id, false);
    } else if (job.name === 'ping') {
      await this.camerasService.updateActive(camera.id, false);
    }
  }

  @OnQueueCompleted()
  async handleCompleted(job: Job<Camera>, result: any) {
    const camera = job.data;

    if (job.name === 'record') {
      await this.camerasService.updateRecording(camera.id, result);
    } else if (job.name === 'ping') {
      return this.updateCameraActive(camera, result);
    }
  }

  private async updateCameraActive(camera: Camera, active: boolean) {
    await this.camerasService.updateActive(camera.id, active);

    if (!active && camera.recording)
      await this.camerasService.updateRecording(camera.id, false);

    this.logger.verbose(`Updated camera ${camera.name || camera.host}`);
  }
}

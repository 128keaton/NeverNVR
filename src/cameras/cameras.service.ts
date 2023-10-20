import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { CameraProperties } from './types';
import { Interval } from '@nestjs/schedule';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import camerasConfig from './cameras.config';
import { ConfigType } from '@nestjs/config';
import * as fs from 'fs';

@Injectable()
export class CamerasService {
  private logger = new Logger(CamerasService.name);

  constructor(
    private prismaService: PrismaService,
    @InjectQueue('camera') private cameraQueue: Queue,
    @Inject(camerasConfig.KEY)
    private config: ConfigType<typeof camerasConfig>,
  ) {
    // Check cameras a second after startup
    setTimeout(() => {
      this.checkCameras().then(() => {
        return this.startRecording();
      });
    }, 1000);
    this.checkDirectories();
  }

  /**
   * Create a new Camera
   * @param camera
   */
  create(camera: CameraProperties) {
    return this.prismaService.camera.create({
      data: camera,
      include: {
        clips: true,
        snapshots: true,
      },
    });
  }

  /**
   * Delete a single Camera
   * @param id
   */
  delete(id: string) {
    return this.prismaService.camera.delete({
      where: {
        id,
      },
      include: {
        clips: true,
        snapshots: true,
      },
    });
  }

  /**
   * Update a Camera's properties
   * @param id
   * @param camera
   */
  async update(id: string, camera: CameraProperties) {
    if (!!camera.mode && camera.mode !== 'RECORD') {
      const existingCamera = await this.prismaService.camera.findFirst({
        where: {
          id,
        },
        select: {
          recordingPID: true,
        },
      });

      if (!!existingCamera && !!existingCamera.recordingPID) {
        this.logger.verbose(
          `Killing process with PID ${existingCamera.recordingPID}`,
        );

        await process.kill(existingCamera.recordingPID);
      }
    } else if (!!camera && camera.mode === 'RECORD') {
      const existingCamera = await this.prismaService.camera.update({
        where: {
          id,
          recording: false,
        },
        data: camera,
        include: {
          clips: true,
          snapshots: true,
        },
      });

      await this.cameraQueue.add('record', existingCamera);

      return existingCamera;
    }

    return this.prismaService.camera.update({
      where: {
        id,
      },
      data: camera,
      include: {
        clips: true,
        snapshots: true,
      },
    });
  }

  /**
   * Update Camera recording
   * @param id
   * @param recording
   */
  updateRecording(id: string, recording: boolean) {
    return this.prismaService.camera.update({
      where: {
        id,
      },
      data: {
        recording,
      },
    });
  }

  /**
   * Update recording PID
   * @param id
   * @param recordingPID
   */
  updateRecordingPID(id: string, recordingPID: number | null) {
    return this.prismaService.camera.update({
      where: {
        id,
      },
      data: {
        recordingPID,
      },
    });
  }

  /**
   * Update Camera active
   * @param id
   * @param active
   */
  updateActive(id: string, active: boolean) {
    let lastPing: Date | undefined;

    if (active) lastPing = new Date();

    return this.prismaService.camera.update({
      where: {
        id,
      },
      data: {
        active,
        lastPing,
      },
    });
  }

  /**
   * Check if a camera is active
   * @param id
   */
  checkActive(id: string) {
    return this.prismaService.camera
      .findFirstOrThrow({
        where: {
          id,
        },
      })
      .then((camera) => {
        return this.cameraQueue.add('ping', camera);
      });
  }

  /**
   * Get a camera with its clips and snapshots
   * @param id
   */
  camera(id: string) {
    return this.prismaService.camera.findFirstOrThrow({
      where: {
        id,
      },
      include: {
        clips: true,
        snapshots: true,
      },
    });
  }

  /**
   * Check if snapshot/clip directories exist
   */
  private checkDirectories() {
    this.checkCreateDirectory(this.config.clipStoragePath);
    this.checkCreateDirectory(this.config.snapshotStoragePath);
  }

  /**
   * Check if a directory exists and create if not
   * @param path
   * @private
   */
  private checkCreateDirectory(path: string) {
    if (!fs.existsSync(path)) {
      this.logger.warn(`${path} does not exist, creating now`);
      fs.mkdirSync(path);
      this.logger.verbose(`${path} now exists`);
    } else this.logger.verbose(`${path} exists`);
  }

  /**
   * Ping cameras every 1m/60s/60000ms
   * @private
   */
  @Interval('ping-cameras', 60000)
  private async checkCameras() {
    this.logger.verbose('Checking cameras');

    const cameras = await this.prismaService.camera.findMany();

    // If no cameras, do not ping
    if (cameras.length === 0) {
      this.logger.verbose('No cameras to check');
      return;
    }

    // Iterate through cameras list
    for (const camera of cameras) {
      await this.cameraQueue.add('ping', camera);
    }
  }

  private async startRecording() {
    const cameras = await this.prismaService.camera.findMany({
      where: {
        mode: 'RECORD',
      },
    });

    for (const camera of cameras) {
      await this.cameraQueue.add('record', camera);
    }
  }
}

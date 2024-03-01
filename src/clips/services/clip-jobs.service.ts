import { PrismaService } from '../../services/prisma/prisma.service';
import { Clip, Job, JobState, JobType } from '@prisma/client';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { HttpStatusCode } from 'axios';
import { ClipsService } from './clips.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Interval } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { join } from 'path';
import { ClipJobEvent } from '../type';

@Injectable()
export class ClipJobsService {
  private logger = new Logger(ClipJobsService.name);

  constructor(
    private prismaService: PrismaService,
    private clipsService: ClipsService,
    @InjectQueue('clipJobs')
    private clipJobsQueue: Queue<string | ClipJobEvent>,
  ) {
    setTimeout(() => {
      this.updateJobs().then();
    }, 5000);
  }

  getClipJobs(filter?: {
    type?: JobType;
    state?: JobState;
    filePath?: string;
  }) {
    return this.prismaService.job.findMany({
      where: {
        type: filter.type,
        state: filter.state,
        filePath: {
          contains: filter.filePath,
          mode: 'insensitive',
        },
      },
    });
  }

  getClipJob(id: string) {
    return this.prismaService.job.findFirst({
      where: {
        id,
      },
      include: {
        clips: {
          select: {
            clip: {
              include: {
                gateway: {
                  select: {
                    s3Bucket: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async joinClips(clips: string[], cameraID: string) {
    const camera = await this.prismaService.camera.findFirst({
      where: {
        id: cameraID,
      },
      select: {
        id: true,
        gateway: {
          select: {
            s3Bucket: true,
          },
        },
      },
    });

    if (!camera)
      throw new HttpException('Invalid camera', HttpStatusCode.BadRequest);

    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    const fileName = `${cameraID}-${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    const filePath = join(
      camera.gateway.s3Bucket,
      `${year}-${month}-${day}`,
      cameraID,
      'concatenated',
      fileName,
    );

    return this.createClipJob('CONCAT', filePath, clips);
  }

  async createClipJob(type: JobType, filePath: string, clips: string[]) {
    if (type === 'TIMELAPSE')
      throw new HttpException(
        'Cannot create timelapse from clips',
        HttpStatusCode.BadRequest,
      );

    const hashContent = clips.sort((a, b) => a.localeCompare(b)).join(';');
    const hash = createHash('md5').update(hashContent).digest('hex');

    const emptyJob = await this.prismaService.job.create({
      data: {
        type,
        filePath,
        hash,
      },
    });

    const clipJobData = clips.map((clipID) => {
      return {
        clipID,
        jobID: emptyJob.id,
      };
    });

    await this.prismaService.clipJobs.createMany({
      data: clipJobData,
    });

    const job = await this.prismaService.job.findFirst({
      where: {
        id: emptyJob.id,
      },
      include: {
        clips: {
          select: {
            clip: true,
          },
        },
      },
    });

    this.logger.verbose(`Adding to start queue ${job.id}`);

    await this.clipJobsQueue.add('start', job.id, { jobId: `${job.id}-start` });

    await this.clipJobsQueue.add('outgoing', {
      eventType: 'updated',
      job,
    });

    return job;
  }

  @Interval(5000)
  async updateAmazonJobs() {
    const jobs = await this.prismaService.job.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                state: {
                  notIn: ['COMPLETE', 'ERROR', 'STALLED'],
                },
              },
              {
                state: 'COMPLETE',
                generatedClipID: null,
              },
            ],
          },
          {
            serviceID: {
              not: null,
            },
          },
          {
            serviceID: {
              not: '',
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    jobs.forEach((job) => {
      this.clipJobsQueue.add('update', job.id, {
        jobId: `${job.id}-update-${Date.now()}`,
      });
    });
  }

  @Interval(10000)
  async updateJobs() {
    const jobs = await this.prismaService.job.findMany({
      where: {
        state: {
          notIn: ['COMPLETE', 'ERROR', 'STALLED'],
        },
        serviceID: null,
      },
      select: {
        id: true,
      },
    });

    jobs.forEach((job) => {
      this.clipJobsQueue.add('update', job.id, {
        jobId: `${job.id}-update-${Date.now()}`,
      });
    });
  }

  @Interval(10000)
  async findStalledJobs() {
    const jobs = await this.prismaService.job.findMany({
      where: {
        state: {
          notIn: ['STALLED', 'COMPLETE', 'ERROR'],
        },
      },
    });

    const oneMin = 60 * 1000;
    const fiveMin = 5 * oneMin;

    const jobIDs = jobs
      .filter((job) => {
        const now = new Date().getTime();
        const diff = now - job.lastUpdated.getTime();

        if (job.state === 'REQUESTING' || job.state === 'UPLOADING')
          return diff >= oneMin;
        else return diff >= fiveMin;
      })
      .map((job) => job.id);

    for (const id in jobIDs) await this.updateJobState(id, 'STALLED');
  }

  async requestClips(jobID: string, clips: Clip[]) {
    this.logger.verbose(`We have ${clips.length} clips to process in this job`);
    await this.updateJobState(jobID, JobState.REQUESTING);

    const camera = await this.prismaService.camera.findFirst({
      where: {
        id: clips[0].cameraID,
      },
      select: {
        gatewayID: true,
      },
    });

    return this.clipsService.uploadClips(
      camera.gatewayID,
      clips.map((clip) => clip.id),
    );
  }

  async updateJobState(id: string, state: JobState) {
    const finishedAt: Date | undefined =
      state === 'COMPLETE' ? new Date() : undefined;

    const job = await this.prismaService.job.update({
      where: {
        id,
        state: {
          not: state,
        },
      },
      data: {
        state,
        finishedAt,
        lastUpdated: new Date(),
      },
    });

    if (!job) return;

    await this.clipJobsQueue.add('outgoing', job.id);
    this.logger.verbose(`Job(${id}) state is now ${state}`);

    await this.handleUpdate(job);

    return job;
  }

  async connectGeneratedClip(id: string, clipID: string) {
    const job = await this.prismaService.job.update({
      where: {
        id,
      },
      data: {
        generatedClip: {
          connect: {
            id: clipID,
          },
        },
      },
    });
    return this.handleUpdate(job);
  }

  async updateJobServiceID(id: string, serviceID: string) {
    const job = await this.prismaService.job.update({
      where: {
        id,
      },
      data: {
        serviceID,
        lastUpdated: new Date(),
      },
    });
    return this.handleUpdate(job);
  }

  async updateJobErrorMessage(id: string, errorMessage: string) {
    return this.prismaService.job
      .update({
        where: {
          id,
        },
        data: {
          errorMessage,
          lastUpdated: new Date(),
        },
      })
      .then(this.handleUpdate);
  }

  async updatePercentComplete(
    id: string,
    percentComplete: number,
    type: 'GENERATION' | 'UPLOAD',
  ) {
    const job = await this.prismaService.job.update({
      where: {
        id,
      },
      data: {
        generationProgress: type === 'GENERATION' ? percentComplete : undefined,
        uploadProgress: type === 'UPLOAD' ? percentComplete : undefined,
        lastUpdated: new Date(),
      },
    });
    return this.handleUpdate(job);
  }

  async updateItemsUploaded(id: string, itemsUploaded: number) {
    const job = await this.prismaService.job.update({
      where: {
        id,
      },
      data: {
        itemsUploaded,
        lastUpdated: new Date(),
      },
    });
    return this.handleUpdate(job);
  }

  private handleUpdate(job: Job) {
    return this.clipJobsQueue.add('outgoing', {
      eventType: 'updated',
      job,
    });
  }
}

import { OnQueueProgress, Process, Processor } from '@nestjs/bull';
import { Clip, JobState } from '@prisma/client';
import { Job as BullJob } from 'bull';
import { filter, tap } from 'rxjs';
import { AppHelpers } from '../../app.helpers';
import { AmazonService } from '../../services/s3/amazon.service';
import { ClipJobsService, ClipsService } from '../services';
import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { OutputDetail } from '@aws-sdk/client-mediaconvert';
import { ClipsGateway } from '../clips.gateway';
import { ClipJobEvent } from '../type';

@Processor('clipJobs')
export class ClipJobsQueue {
  private logger = new Logger(ClipJobsQueue.name);
  private _lock: string[] = [];

  constructor(
    private clipJobsService: ClipJobsService,
    private clipsService: ClipsService,
    private amazonService: AmazonService,
    private clipsGateway: ClipsGateway,
  ) {}

  @Process('outgoing')
  outgoingUpdate(bullJob: BullJob<ClipJobEvent>) {
    return this.clipsGateway.handleClipJobEvent(bullJob.data);
  }

  @Process('start')
  async startJob(bullJob: BullJob<string>) {
    const jobID = bullJob.data;
    const job = await this.clipJobsService.getClipJob(jobID);

    const clips = job.clips
      .flatMap((clipJob) => {
        return clipJob.clip;
      })
      .filter((clip) => {
        return clip.availableCloud || clip.availableLocally;
      });

    const clipsToRequest = clips.filter((clip) => !clip.availableCloud);
    const clipsAvailable = clips.filter((clip) => clip.availableCloud);

    this.logger.verbose(
      `This job already has ${clipsAvailable.length} clips uploaded`,
    );

    await this.clipJobsService.updateItemsUploaded(
      jobID,
      clipsAvailable.length,
    );

    this.logger.verbose('Checking to see if we need to request any clips');
    if (clipsToRequest.length > 0) {
      this.logger.verbose(`Requesting ${clipsToRequest.length} clips`);

      // 1. Request
      const request = await this.clipJobsService.requestClips(
        job.id,
        clipsToRequest,
      );
      this.logger.verbose(`Request totalUpdated: ${request.totalUpdated}`);

      // 2. Update state to UPLOADING
      await this.clipJobsService.updateJobState(jobID, JobState.UPLOADING);

      // 3. Wait for clips to upload
      await this.waitForClipsToUpload(clipsToRequest, (clipsUploaded) => {
        bullJob.progress();
        bullJob.log(clipsUploaded.pop());
        this.clipJobsService.updateItemsUploaded(jobID, clipsUploaded.length);
      });
    }

    await this.joinClips(job, jobID, clips);
  }

  @Process('update')
  async updateJob(bullJob: BullJob<string>) {
    const jobID = bullJob.data;
    const job = await this.clipJobsService.getClipJob(jobID);

    const createJobClip = async (outputDetails: OutputDetail) => {
      const videoDetails = outputDetails.VideoDetails;
      const clips = job.clips.flatMap((clip) => clip.clip);
      const cameraID = clips[0].cameraID;
      const gatewayID = clips[0].gatewayID;
      const start = clips[0].start;
      const end = clips[clips.length - 1].end;

      const fileDetails = await this.amazonService.getFileDetails(job.filePath);

      return this.clipsService
        .create(
          {
            type: 'generated',
            id: uuidv4(),
            width: videoDetails.WidthInPx,
            height: videoDetails.HeightInPx,
            duration: outputDetails.DurationInMs / 1000,
            format: 'h265',
            fileSize: fileDetails.ContentLength || 0,
            availableCloud: true,
            availableLocally: false,
            fileName: job.filePath.split('/').pop(),
            analyzed: false,
            tags: [],
            gatewayID,
            start,
            end,
            generateJobID: jobID,
          },
          cameraID,
          false,
        )
        .then((clip) => {
          this.logger.verbose('clip', clip);
          return clip;
        });
    };

    if (!!job.serviceID) {
      const amazonOutput = await this.amazonService.getMediaStatus(
        job.serviceID,
      );

      if (job.state === 'COMPLETE' && !job.generatedClipID) {
        this.logger.verbose('Creating clip for generated clip');
        const outputDetails =
          amazonOutput.Job.OutputGroupDetails[0].OutputDetails[0];
        const clip = await createJobClip(outputDetails);

        await this.clipJobsService.connectGeneratedClip(jobID, clip.id);

        return;
      }

      const generationProgress = amazonOutput.Job.JobPercentComplete;
      const currentStatus = amazonOutput.Job.Status;
      const errorMessage = amazonOutput.Job.ErrorMessage;

      if (errorMessage && job.errorMessage !== errorMessage)
        await this.clipJobsService.updateJobErrorMessage(jobID, errorMessage);

      if (generationProgress !== job.generationProgress)
        await this.clipJobsService.updatePercentComplete(
          jobID,
          generationProgress,
          'GENERATION',
        );

      if (currentStatus === 'PROGRESSING' && job.state !== 'PROCESSING') {
        await this.clipJobsService.updateJobState(jobID, 'PROCESSING');
        job.state = 'PROCESSING';
      } else if (currentStatus === 'ERROR' && job.state !== 'ERROR') {
        await this.clipJobsService.updateJobState(jobID, 'ERROR');
        job.state = 'ERROR';
      } else if (generationProgress >= 100 && job.state !== 'COMPLETE') {
        await this.clipJobsService.updateJobState(jobID, 'COMPLETE');
        job.state = 'COMPLETE';
      } else if (currentStatus === 'COMPLETE' && job.state !== 'COMPLETE') {
        await this.clipJobsService.updateJobState(jobID, 'COMPLETE');
        await this.clipJobsService.updatePercentComplete(
          jobID,
          100,
          'GENERATION',
        );

        job.state = 'COMPLETE';
        job.generationProgress = 100;
      }
    } else {
      const clips = job.clips
        .flatMap((clipJob) => {
          return clipJob.clip;
        })
        .filter((clip) => {
          return clip.availableCloud || clip.availableLocally;
        });

      const clipsToRequest = clips.filter((clip) => !clip.availableCloud);

      if (clipsToRequest.length === 0) {
        await this.clipJobsService.updateItemsUploaded(jobID, clips.length);
        await this.joinClips(job, jobID, clips);
      } else {
        const requestedIDs = clipsToRequest.map((clip) => clip.id);

        this.logger.verbose(
          `Still waiting on ${
            clipsToRequest.length
          } to upload: ${requestedIDs.join(',')}`,
        );

        const total = clips.length;
        const uploaded = total - clipsToRequest.length;
        const uploadProgress = (uploaded / total) * 100;

        if (job.itemsUploaded !== uploaded)
          await this.clipJobsService.updateItemsUploaded(jobID, uploaded);

        if (job.uploadProgress !== uploadProgress)
          await this.clipJobsService.updatePercentComplete(
            jobID,
            uploadProgress,
            'UPLOAD',
          );
      }
    }
  }

  @OnQueueProgress()
  progressHandler(bullJob: BullJob, progress: number) {
    this.logger.verbose(`Job(${bullJob.id}) progress: ${progress}`);
  }

  private async joinClips(
    job: {
      serviceID?: string;
      filePath: string;
      hash: string;
      state: JobState;
    },
    jobID: string,
    clips: {
      fileName: string;
      cameraID: string;
      gateway: { s3Bucket: string };
    }[],
  ) {
    // Probably not the _best_ way of doing this
    // TODO probably make this go back into the queue
    if (!this._lock.includes(jobID)) this._lock.push(jobID);
    else return;

    const files = clips.map((clip) => {
      return `${clip.gateway.s3Bucket}/${AppHelpers.getFileKey(
        clip.fileName,
        clip.cameraID,
        '.mp4',
      )}`;
    });

    if (job.serviceID && job.serviceID.length > 0) {
      if (job.state !== JobState.PROCESSING)
        await this.clipJobsService.updateJobState(jobID, JobState.PROCESSING);

      return;
    }

    const output = await this.amazonService.combineClips(
      files,
      job.filePath,
      {
        hash: job.hash,
        nvrID: jobID,
      },
      true,
    );

    // Update state to PROCESSING
    await this.clipJobsService.updateJobState(jobID, JobState.PROCESSING);
    await this.clipJobsService.updateJobServiceID(jobID, output.Job.Id);
  }

  private waitForClipsToUpload(
    clips: Clip[],
    progressCallback: (clips: string[]) => any = () => {},
  ) {
    const clipIDs = clips.map((clip) => clip.id);
    const uploadedClipIDs: string[] = [];

    this.logger.verbose('Wait for clips to upload');

    return new Promise((resolve) => {
      this.clipsService.clipEvents
        .pipe(
          filter((event) => clipIDs.includes(event.clip.id)),
          filter((event) => event.eventType === 'updated'),
          filter((event) => event.clip.availableCloud),
          tap((event) =>
            this.logger.verbose(`clip in cloud: ${event.clip.availableCloud}`),
          ),
        )
        .subscribe((event) => {
          uploadedClipIDs.push(event.clip.id);

          if (uploadedClipIDs.length >= clipIDs.length) resolve(true);
          else progressCallback(uploadedClipIDs);
        });
    });
  }
}

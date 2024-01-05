import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ClassificationResponse, JobResponse } from './responses';
import { catchError, filter, map, of } from 'rxjs';
import { AppHelpers } from '../app.helpers';
import { io, Socket } from 'socket.io-client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class VideoAnalyticsService {
  private videoAnalyticsSocket: Socket;
  private logger = new Logger(VideoAnalyticsService.name);
  private readonly apiURL: string;
  private readonly apiToken: string;

  getHeaders() {
    return {
      Authorization: `Bearer ${this.apiToken}`,
    };
  }

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @InjectQueue('clips') private clipQueue: Queue,
    @InjectQueue('snapshots') private snapshotQueue: Queue,
  ) {
    this.apiURL = this.configService.get('VA_API_URL') || '';
    this.apiToken = this.configService.get('VA_API_TOKEN') || '';

    this.videoAnalyticsSocket = io(this.configService.get('VA_WS_URL') || '', {
      autoConnect: true,
      transports: ['websocket'],
      path: '/socket',
    });

    this.videoAnalyticsSocket.on('connect_error', (err) => {
      if (err['type'] !== 'TransportError') {
        this.logger.error(err);
      }
      setTimeout(() => {
        this.videoAnalyticsSocket.connect();
      }, 1000);
    });

    this.videoAnalyticsSocket.on('connect', () => {
      this.logger.verbose('Connected to Video Analytics API over WebSocket');
    });

    this.videoAnalyticsSocket.on('job_finished', (job) => {
      this.handleJobFinished(job);
    });

    this.videoAnalyticsSocket.on('job_started', (job) => {
      return this.handleJobStarted(job);
    });
  }

  /**
   * Returns a job ID to associate with a clip
   * @param fileName - Name of the clip
   * @param cameraID - Name of the camera associated with the clip
   * @param bucketName - S3 Bucket name
   */
  classifyVideoClip(fileName: string, cameraID: string, bucketName: string) {
    const url = `${this.apiURL}/jobs/create`;
    const videoClipPath = AppHelpers.getFileKey(fileName, cameraID, '.mp4');

    return this.httpService
      .post<JobResponse>(
        url,
        {
          bucket_name: bucketName,
          request_type: 'classify',
          images: [],
          videos: [videoClipPath],
        },
        {
          headers: this.getHeaders(),
        },
      )
      .pipe(
        map((response) => response.data),
        map((data) => data.id),
        catchError((err) => {
          this.logger.error(err);

          return of(null);
        }),
      );
  }

  classifyImage(fileName: string, cameraID: string, bucketName: string) {
    const url = `${this.apiURL}/jobs/create`;
    const imageClipPath = AppHelpers.getFileKey(fileName, cameraID, '.jpeg');

    return this.httpService
      .post<JobResponse>(
        url,
        {
          bucket_name: bucketName,
          request_type: 'classify',
          images: [imageClipPath],
          videos: [],
        },
        {
          headers: this.getHeaders(),
        },
      )
      .pipe(
        map((response) => response.data),
        map((data) => data.id),
        catchError((err) => {
          this.logger.error(err);

          return of(null);
        }),
      );
  }

  getClassificationData(fileName: string, jobID: string) {
    const url = `${this.apiURL}/${jobID}/${fileName}`;
    return this.httpService
      .get<ClassificationResponse>(url, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response) => response.data),
        catchError((err) => {
          this.logger.error(err);

          return of(null);
        }),
      );
  }

  checkJobStatus(jobID: string) {
    const url = `${this.apiURL}/${jobID}`;
    return this.httpService
      .get<JobResponse>(url, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response) => response.data),
        catchError((err) => {
          this.logger.error(err);

          return of(null);
        }),
      );
  }

  handleJobStarted(job: JobResponse) {
    this.logger.verbose(`Analysis job started: ${job.id}`);
    this.clipQueue.add('started-analyze', job.id, { delay: 1000 }).then();
    this.snapshotQueue.add('started-analyze', job.id, { delay: 1000 }).then();
  }

  handleJobFinished(job: JobResponse) {
    this.logger.verbose(`Analysis job finished: ${job.id}`);
    job.files_processed.forEach((file) => {
      this.handleJobFileProcessed(file, job);
    });
  }

  handleJobFileProcessed(file: string, job: JobResponse) {
    this.getClassificationData(file, job.id)
      .pipe(filter(Boolean))
      .subscribe((classification) => {
        const data = {
          analyticsJobID: job.id,
          analyzedFileName: classification.annotated_file_name,
          analyzed: classification.processed,
          primaryTag: classification.tags[0],
          tags: classification.tags,
        };

        if (file.includes('.mp4'))
          return this.clipQueue.add('finished-analyze', data, { delay: 1000 });

        return this.snapshotQueue.add('finished-analyze', data, {
          delay: 1000,
        });
      });
  }
}

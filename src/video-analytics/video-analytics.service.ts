import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  ClassificationResponse,
  ClassificationJobResponse,
  TimelapseJobResponse,
} from './responses';
import { catchError, filter, map, Observable, of } from 'rxjs';
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
    @InjectQueue('timelapse')
    private timelapseQueue: Queue<{ jobID: string; outputFilename: string }>,
    @InjectQueue('snapshots') private snapshotQueue: Queue,
  ) {
    this.apiURL = this.configService.get('VA_API_URL') || '';
    this.apiToken = this.configService.get('VA_API_TOKEN') || '';

    this.videoAnalyticsSocket = io(this.configService.get('VA_WS_URL') || '', {
      autoConnect: true,
      transports: ['websocket'],
      path: '/socket',
      reconnection: true,
      reconnectionDelay: 1000,
    });

    this.videoAnalyticsSocket.on('connect_error', (err) => {
      this.logger.error(err);
      setTimeout(() => {
        this.videoAnalyticsSocket.connect();
      }, 1000);
    });

    this.videoAnalyticsSocket.on('connect', () => {
      this.logger.verbose('Connected to Video Analytics API over WebSocket');
    });

    this.videoAnalyticsSocket.on('disconnect', () => {
      this.logger.verbose(
        'Disconnected from Video Analytics API over WebSocket',
      );
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
      .post<ClassificationJobResponse>(
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
      .post<ClassificationJobResponse>(
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

  createTimelapse(
    fileNames: string[],
    cameraID: string,
    bucketName: string,
    start: Date,
    end: Date,
  ): Observable<string> {
    const url = `${this.apiURL}/timelapse/create`;
    const imageClipPaths = fileNames.map((fileName) =>
      AppHelpers.getFileKey(fileName, cameraID, '.jpeg'),
    );

    const [startYear, startMonth, startDay] = start
      .toISOString()
      .split('T')[0]
      .split('-');
    const [endYear, endMonth, endDay] = end
      .toISOString()
      .split('T')[0]
      .split('-');

    const diffTime = Math.abs(start.getTime() - end.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    this.logger.log('Creating timelapse job');

    return this.httpService
      .post<TimelapseJobResponse>(
        url,
        {
          camera_id: cameraID,
          bucket_name: bucketName,
          request_type: 'timelapse',
          images: imageClipPaths,
          videos: [],
          start_date: `${startYear}-${startMonth}-${startDay}`,
          end_date: `${endYear}-${endMonth}-${endDay}`,
          days,
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
      .get<ClassificationJobResponse>(url, {
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

  handleJobStarted(job: ClassificationJobResponse) {
    if (job.job_type === 'classification') {
      this.logger.verbose(`Classification job started: ${job.id}`);
      this.clipQueue.add('started-analyze', job.id, { delay: 1000 }).then();
      this.snapshotQueue.add('started-analyze', job.id, { delay: 1000 }).then();
    } else if (job.job_type === 'timelapse') {
      this.logger.verbose(`Timelapse job started: ${job.id}`);
    }
  }

  handleJobFinished(job: ClassificationJobResponse | TimelapseJobResponse) {
    if (job.job_type === 'classification') {
      const classificationJob = job as ClassificationJobResponse;
      this.logger.verbose(`Classification job finished: ${job.id}`);
      classificationJob.files_processed.forEach((file) => {
        this.handleJobFileProcessed(file, classificationJob);
      });
    } else if (job.job_type === 'timelapse') {
      const timelapseJob = job as TimelapseJobResponse;
      this.logger.verbose(`Timelapse job finished: ${job.id}`);
      this.logger.verbose(JSON.stringify(job));

      return this.timelapseQueue.add('finished', {
        jobID: timelapseJob.id,
        outputFilename: timelapseJob.output_file,
      });
    }
  }

  handleJobFileProcessed(file: string, job: ClassificationJobResponse) {
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

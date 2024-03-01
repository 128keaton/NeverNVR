import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  ContainerType,
  CreateJobCommand,
  GetJobCommand,
  MediaConvertClient,
  OutputGroupType,
  TimecodeSource,
} from '@aws-sdk/client-mediaconvert';
import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class AmazonService {
  private logger: Logger = new Logger(AmazonService.name);

  private readonly s3Client: S3Client;
  private readonly mediaConvertClient: MediaConvertClient;
  private readonly region: string;
  private readonly accessKeyID: string;
  private readonly secretAccessKey: string;

  constructor(private configService: ConfigService) {
    this.accessKeyID = this.configService.getOrThrow('AWS_ACCESS_KEY_ID');
    this.secretAccessKey = this.configService.getOrThrow(
      'AWS_SECRET_ACCESS_KEY',
    );
    this.region = this.configService.get('AWS_REGION') || 'us-east-2';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyID,
        secretAccessKey: this.secretAccessKey,
      },
    });

    this.mediaConvertClient = new MediaConvertClient({ region: this.region });
  }

  /**
   * Upload a file to S3
   * @param filePath
   * @param bucket
   * @param file
   */
  async uploadFile(
    filePath: string,
    bucket: string,
    file: Express.Multer.File,
  ) {
    this.logger.log(
      `Uploading file named: ${file.originalname} with mimetype: ${file.mimetype}`,
    );

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: filePath,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    this.logger.verbose(`Uploading ${filePath} to S3 bucket ${bucket}`);

    try {
      return await this.s3Client.send(command).then((result) => {
        if (!!result && !!result.$metadata && !!result.$metadata.httpStatusCode)
          return result.$metadata.httpStatusCode === 200;

        return false;
      });
    } catch (err) {
      this.logger.error(`Error uploading to S3: ${err}`);
      return false;
    }
  }

  /**
   * Delete a file on S3
   * @param fileName - Name of file/key
   * @param bucket
   */
  async deleteFile(fileName: string, bucket: string) {
    const key = await this.getValidFilePath(fileName, bucket);
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    this.logger.verbose(`Deleting ${fileName} from S3 bucket ${bucket}`);

    try {
      return await this.s3Client.send(command).then((result) => {
        if (!!result && !!result.$metadata && !!result.$metadata.httpStatusCode)
          return result.$metadata.httpStatusCode === 204;

        return false;
      });
    } catch (err) {
      this.logger.error(`Error deleting from S3: ${err}`);
      return false;
    }
  }

  /**
   * Get a file from S3
   * @param fileName - Name of file/key
   * @param bucket
   */
  async getFile(fileName: string, bucket: string) {
    const key = await this.getValidFilePath(fileName, bucket);
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    this.logger.verbose(`Downloading ${fileName} from S3 bucket ${bucket}`);

    try {
      const response = await this.s3Client.send(command);
      const byteArray = await response.Body.transformToByteArray();

      return new StreamableFile(byteArray);
    } catch (err) {
      this.logger.error(`Could not get file from S3: ${err}`);
      return null;
    }
  }

  /**
   * Get a signed file URL from S3
   * @param fileName  - Name of file/key
   * @param bucket
   * @param expiresIn
   */
  async getFileURL(fileName: string, bucket: string, expiresIn = 3600) {
    this.logger.verbose(`Get file url: ${fileName}`);

    const key = await this.getValidFilePath(fileName, bucket);
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    this.logger.verbose(
      `Generating signed URL for ${fileName} from S3 bucket ${bucket}`,
    );

    return {
      url,
    };
  }

  async combineClips(
    clips: string[],
    output: string,
    metadata?: { [key: string]: string },
    acceleration: boolean = false,
  ) {
    try {
      const data = await this.mediaConvertClient.send(
        new CreateJobCommand({
          AccelerationSettings: {
            Mode: acceleration ? 'PREFERRED' : 'DISABLED',
          },
          Settings: {
            Inputs: clips.map((file) => {
              return {
                TimecodeSource: TimecodeSource.ZEROBASED,
                VideoSelector: {},
                AudioSelectors: {},
                FileInput: `s3://${file}`,
              };
            }),
            OutputGroups: [
              {
                Name: 'File Group',
                OutputGroupSettings: {
                  Type: OutputGroupType.FILE_GROUP_SETTINGS,
                  FileGroupSettings: {
                    Destination: `s3://${output.replace('.mp4', '')}`,
                  },
                },
                Outputs: [
                  {
                    VideoDescription: {
                      CodecSettings: {
                        Codec: 'H_265',
                        H265Settings: {
                          CodecProfile: 'MAIN_MAIN',
                          MaxBitrate: 5000000,
                          RateControlMode: 'QVBR',
                          WriteMp4PackagingType: 'HVC1',
                          QualityTuningLevel: 'SINGLE_PASS_HQ',
                          QvbrSettings: {
                            QvbrQualityLevel: 8,
                          },
                        },
                      },
                    },
                    ContainerSettings: {
                      Container: ContainerType.MP4,
                      Mp4Settings: {
                        MoovPlacement: 'PROGRESSIVE_DOWNLOAD',
                      },
                    },
                  },
                ],
              },
            ],
            TimecodeConfig: {
              Source: TimecodeSource.ZEROBASED,
            },
            FollowSource: 1,
          },
          UserMetadata: metadata,
          Role: 'arn:aws:iam::689340570029:role/MediaConvert_Default_Role',
        }),
      );
      this.logger.log('Job created!', data);
      return data;
    } catch (err) {
      this.logger.error('Error', err);
    }
  }

  async getMediaStatus(id: string) {
    const input = {
      // GetJobRequest
      Id: id, // required
    };
    const command = new GetJobCommand(input);

    return this.mediaConvertClient.send(command);
  }

  async getFileDetails(validFilePath: string) {
    const splitPath = validFilePath.split('/');
    const bucket = splitPath[0];
    const key = splitPath.slice(1).join('/');

    const command = new HeadObjectCommand({
      Key: key.includes('.mp4') ? key : `${key}.mp4`,
      Bucket: bucket,
    });

    return this.s3Client.send(command);
  }

  private async getValidFilePath(
    filePath: string,
    bucket: string,
  ): Promise<string> {
    const fileExists = await this.fileExists(filePath, bucket);

    if (!fileExists) {
      const splitFilePath = filePath.split('/');
      const fileName = splitFilePath.pop();

      if (splitFilePath.length === 0) {
        const singlePathExists = await this.fileExists(fileName, bucket);

        if (!singlePathExists) throw new Error(`Cannot find ${fileName}`);

        return fileName;
      }

      return this.getValidFilePath(
        join(...splitFilePath.slice(0, splitFilePath.length - 1), fileName),
        bucket,
      );
    }

    return filePath;
  }

  async fileExists(fileName: string, bucket: string) {
    try {
      const response = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: fileName,
        }),
      );

      return !!response;
    } catch (error) {
      if (error.httpStatusCode === 404) return false;
    }
  }
}

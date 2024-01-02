import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private logger: Logger = new Logger(S3Service.name);

  private readonly client: S3Client;
  private readonly region: string;
  private readonly accessKeyID: string;
  private readonly secretAccessKey: string;

  constructor(private configService: ConfigService) {
    this.accessKeyID = this.configService.getOrThrow('AWS_ACCESS_KEY_ID');
    this.secretAccessKey = this.configService.getOrThrow(
      'AWS_SECRET_ACCESS_KEY',
    );
    this.region = this.configService.get('AWS_REGION') || 'us-east-2';

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyID,
        secretAccessKey: this.secretAccessKey,
      },
    });
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
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: filePath,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    this.logger.verbose(`Uploading ${filePath} to S3 bucket ${bucket}`);

    try {
      return await this.client.send(command).then((result) => {
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
      return await this.client.send(command).then((result) => {
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
      const response = await this.client.send(command);
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
   */
  async getFileURL(fileName: string, bucket: string) {
    this.logger.verbose(`Get file url: ${fileName}`);

    const key = await this.getValidFilePath(fileName, bucket);
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: 3600 });

    this.logger.verbose(
      `Generating signed URL for ${fileName} from S3 bucket ${bucket}`,
    );

    return {
      url,
    };
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
      const response = await this.client.send(
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

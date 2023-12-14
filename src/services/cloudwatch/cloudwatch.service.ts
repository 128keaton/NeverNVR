import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CloudWatchClient,
  GetMetricDataCommand,
  StandardUnit,
} from '@aws-sdk/client-cloudwatch';

@Injectable()
export class CloudwatchService {
  private readonly client: CloudWatchClient;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.getOrThrow('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.getOrThrow(
      'AWS_SECRET_ACCESS_KEY',
    );

    const region = this.configService.get('AWS_REGION') || 'us-east-2';

    this.client = new CloudWatchClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async getBucketSize(bucket: string) {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const input = {
      MetricDataQueries: [
        {
          Id: 'bucketSize',
          MetricStat: {
            Metric: {
              ReturnData: true,
              Namespace: 'AWS/S3',
              MetricName: 'BucketSizeBytes',
              Dimensions: [
                {
                  Name: 'BucketName',
                  Value: bucket,
                },
                {
                  Name: 'StorageType',
                  Value: 'StandardStorage',
                },
              ],
            },
            Period: 604800,
            Stat: 'Sum',
            Unit: StandardUnit.Bytes,
          },
        },
      ],
      StartTime: eightDaysAgo,
      EndTime: new Date(),
    };
    const command = new GetMetricDataCommand(input);

    const response = await this.client.send(command);

    if (
      !!response &&
      !!response.MetricDataResults &&
      !!response.MetricDataResults[0] &&
      !!response.MetricDataResults[0].Values &&
      !!response.MetricDataResults[0].Values[0]
    ) {
      return response.MetricDataResults[0].Values[0];
    }

    return 0;
  }
}

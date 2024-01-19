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
    const start = new Date();
    start.setHours(-24, 0, 0, 0);

    const end = new Date();
    end.setHours(0, 0, 0, 0);

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
            Period: 86400,
            Stat: 'Average',
            Unit: StandardUnit.Bytes,
          },
        },
      ],
      StartTime: start,
      EndTime: end,
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

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { SingleStatCount, SizeStat, Stats } from './types';
import { CloudwatchService } from '../services/cloudwatch/cloudwatch.service';

@Injectable()
export class StatsService {
  constructor(
    private prismaService: PrismaService,
    private cloudwatchService: CloudwatchService,
  ) {}

  async getGatewayBucketSize(gatewayID: string): Promise<SizeStat[]> {
    if (gatewayID === 'all' || gatewayID.length === 0)
      return this.getAllBucketSizes();

    const gateway = await this.prismaService.gateway.findFirst({
      where: {
        id: gatewayID,
      },
      select: {
        name: true,
        s3Bucket: true,
      },
    });

    const size = await this.cloudwatchService.getBucketSize(gateway.s3Bucket);

    return [
      {
        size,
        units: 'bytes',
        label: gateway.s3Bucket,
        gateway: gateway.name,
      },
    ];
  }

  async getAllBucketSizes() {
    const gateways = await this.prismaService.gateway.findMany({
      select: {
        s3Bucket: true,
        name: true,
      },
    });

    const stats: SizeStat[] = [];

    for (const gateway of gateways) {
      const size = await this.cloudwatchService.getBucketSize(gateway.s3Bucket);
      stats.push({
        size,
        units: 'bytes',
        label: gateway.s3Bucket,
        gateway: gateway.name,
      });
    }

    return stats;
  }

  async countAll(): Promise<Stats> {
    const cameras = await this.prismaService.camera.count();
    const clips = await this.prismaService.clip.count();
    const snapshots = await this.prismaService.snapshot.count();
    const gateways = await this.prismaService.gateway.count();

    return { cameras, clips, snapshots, gateways };
  }

  async countCameras(): Promise<SingleStatCount> {
    const cameras = await this.prismaService.camera.count();

    return {
      count: cameras,
      type: 'cameras',
    };
  }

  async countClips(cameraID?: string): Promise<SingleStatCount> {
    let clips: number;

    if (cameraID !== undefined)
      clips = await this.prismaService.clip.count({ where: { cameraID } });
    else clips = await this.prismaService.clip.count();

    return {
      count: clips,
      type: 'clips',
    };
  }

  async countSnapshots(cameraID?: string): Promise<SingleStatCount> {
    let snapshots: number;

    if (cameraID !== undefined)
      snapshots = await this.prismaService.snapshot.count({
        where: { cameraID },
      });
    else snapshots = await this.prismaService.snapshot.count();

    return {
      count: snapshots,
      type: 'snapshots',
    };
  }

  async countGateways(): Promise<SingleStatCount> {
    const gateways = await this.prismaService.gateway.count();

    return {
      count: gateways,
      type: 'gateways',
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { SingleStatCount, Stats } from './types';

@Injectable()
export class StatsService {
  constructor(private prismaService: PrismaService) {}

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

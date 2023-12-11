import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import {
  GatewayCreate,
  GatewayDiskSpace,
  GatewayStats,
  GatewayUpdate,
} from './types';
import { ConnectionStatus } from '@prisma/client';
import { lastValueFrom, map } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class GatewaysService {
  constructor(
    private prismaService: PrismaService,
    private httpService: HttpService,
  ) {}

  create(data: GatewayCreate) {
    return this.prismaService.gateway.create({
      data,
    });
  }

  get(id: string) {
    return this.prismaService.gateway.findFirst({
      where: {
        id,
      },
    });
  }

  async getStats(id: string) {
    const gateway = await this.prismaService.gateway.findFirst({
      where: {
        id,
      },
    });

    if (!gateway)
      throw new HttpException(
        `Could not find gateway with ID ${id}`,
        HttpStatus.NOT_FOUND,
      );

    return lastValueFrom(
      this.httpService
        .get<GatewayStats>(`${gateway.connectionURL}/api/stats`)
        .pipe(map((response) => response.data)),
    );
  }

  async getDiskSpace(id: string) {
    const gateway = await this.prismaService.gateway.findFirst({
      where: {
        id,
      },
    });

    if (!gateway)
      throw new HttpException(
        `Could not find gateway with ID ${id}`,
        HttpStatus.NOT_FOUND,
      );

    return lastValueFrom(
      this.httpService
        .get<GatewayDiskSpace>(`${gateway.connectionURL}/api/system/space`)
        .pipe(map((response) => response.data)),
    );
  }

  async getMany() {
    const gateways = await this.prismaService.gateway.findMany();

    return {
      total: gateways.length,
      data: gateways,
    };
  }

  delete(id: string) {
    return this.prismaService.gateway.delete({
      where: {
        id,
      },
    });
  }

  update(id: string, data: GatewayUpdate) {
    return this.prismaService.gateway.update({
      where: {
        id,
      },
      data,
    });
  }

  updateStatus(id: string, status: ConnectionStatus) {
    return this.prismaService.gateway.update({
      where: {
        id,
      },
      data: {
        status,
        lastConnection: status === 'CONNECTED' ? new Date() : undefined,
      },
    });
  }
}

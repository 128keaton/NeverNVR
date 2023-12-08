import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import { GatewayCreate, GatewayUpdate } from './types';
import { ConnectionStatus } from '@prisma/client';

@Injectable()
export class GatewaysService {
  constructor(private prismaService: PrismaService) {}

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

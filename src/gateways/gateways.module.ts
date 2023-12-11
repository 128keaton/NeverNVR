import { Module } from '@nestjs/common';
import { GatewaysService } from './gateways.service';
import { GatewaysController } from './gateways.controller';
import { PrismaModule } from '../services/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { GatewaysGateway } from './gateways.gateway';

@Module({
  providers: [GatewaysService, GatewaysGateway],
  controllers: [GatewaysController],
  imports: [PrismaModule, HttpModule],
  exports: [GatewaysService],
})
export class GatewaysModule {}

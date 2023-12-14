import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { PrismaModule } from '../services/prisma/prisma.module';
import { StatsGateway } from './stats.gateway';
import { GatewaysModule } from '../gateways/gateways.module';
import { CloudwatchModule } from '../services/cloudwatch/cloudwatch.module';

@Module({
  providers: [StatsService, StatsGateway],
  controllers: [StatsController],
  imports: [PrismaModule, GatewaysModule, CloudwatchModule],
})
export class StatsModule {}

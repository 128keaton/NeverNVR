import { Module } from '@nestjs/common';
import { GatewaysService } from './gateways.service';
import { GatewaysController } from './gateways.controller';
import { PrismaModule } from '../services/prisma/prisma.module';

@Module({
  providers: [GatewaysService],
  controllers: [GatewaysController],
  imports: [PrismaModule],
  exports: [GatewaysService]
})
export class GatewaysModule {}

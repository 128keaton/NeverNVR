import { Module } from '@nestjs/common';
import { ClipsService } from './clips.service';
import { PrismaModule } from '../services/prisma/prisma.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { BullModule } from '@nestjs/bull';
import { S3Module } from '../services/s3/s3.module';
import { ClipsGateway } from './clips.gateway';
import { ClipsQueue } from './clips.queue';

@Module({
  providers: [ClipsService, ClipsGateway, ClipsQueue],
  exports: [ClipsService],
  imports: [
    S3Module,
    PrismaModule,
    GatewaysModule,
    BullModule.registerQueue({
      name: 'clips',
    }),
  ],
})
export class ClipsModule {}

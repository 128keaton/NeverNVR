import { Module } from '@nestjs/common';
import { SnapshotsService } from './snapshots.service';
import { SnapshotsController } from './snapshots.controller';
import { SnapshotsGateway } from './snapshots.gateway';
import { PrismaModule } from '../services/prisma/prisma.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { SnapshotsQueue } from './snapshots.queue';
import { BullModule } from '@nestjs/bull';
import { S3Module } from '../services/s3/s3.module';

@Module({
  providers: [SnapshotsService, SnapshotsGateway, SnapshotsQueue],
  controllers: [SnapshotsController],
  exports: [SnapshotsGateway],
  imports: [
    S3Module,
    PrismaModule,
    GatewaysModule,
    BullModule.registerQueue({
      name: 'snapshots',
    }),
  ],
})
export class SnapshotsModule {}

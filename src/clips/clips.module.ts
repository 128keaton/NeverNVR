import { Module } from '@nestjs/common';
import { ClipsService } from './clips.service';
import { ClipsController } from './clips.controller';
import { ClipsConsumer } from './clips.consumer';
import { PrismaModule } from '../services/prisma/prisma.module';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import clipsConfig from './clips.config';

@Module({
  providers: [ClipsService, ClipsConsumer],
  controllers: [ClipsController],
  exports: [ClipsService, ClipsConsumer],
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'clip',
    }),
    ConfigModule.forFeature(clipsConfig),
  ],
})
export class ClipsModule {}

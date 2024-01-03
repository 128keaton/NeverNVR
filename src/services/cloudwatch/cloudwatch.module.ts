import { Module } from '@nestjs/common';
import { CloudwatchService } from './cloudwatch.service';

@Module({
  providers: [CloudwatchService],
  exports: [CloudwatchService],
})
export class CloudwatchModule {}

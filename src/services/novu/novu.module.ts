import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import novuConfig from './novu.config';
import { NovuMessagesService, NovuSubscribersService } from './services';

@Module({
  providers: [NovuMessagesService, NovuSubscribersService],
  exports: [NovuMessagesService, NovuSubscribersService],
  imports: [ConfigModule.forFeature(novuConfig)],
})
export class NovuModule {}

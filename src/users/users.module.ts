import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PrismaService } from '../services/prisma/prisma.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  NovuMessagesService,
  NovuSubscribersService,
} from 'src/services/novu/services';
import { PrismaModule } from '../services/prisma/prisma.module';
import { NovuModule } from '../services/novu/novu.module';
import novuConfig from '../services/novu/novu.config';
import { UsersService } from './users.service';

@Module({
  providers: [
    ConfigService,
    PrismaService,
    NovuMessagesService,
    NovuSubscribersService,
    UsersService,
  ],
  imports: [
    PrismaModule,
    NovuModule,
    ConfigModule,
    ConfigModule.forFeature(novuConfig),
  ],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}

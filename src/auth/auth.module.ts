import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../services/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import {
  NovuMessagesService,
  NovuSubscribersService,
} from 'src/services/novu/services';
import { NovuModule } from '../services/novu/novu.module';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersService,
    JwtService,
    ConfigService,
    NovuSubscribersService,
    NovuMessagesService,
  ],
  imports: [HttpModule, PrismaModule, UsersModule, ConfigModule, NovuModule],
  exports: [AuthService],
})
export class AuthModule {}

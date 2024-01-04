import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../services/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { NovuModule } from '../services/novu/novu.module';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtService],
  imports: [HttpModule, PrismaModule, UsersModule, ConfigModule, NovuModule],
  exports: [AuthService],
})
export class AuthModule {}

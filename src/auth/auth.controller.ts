import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequest, RegisterRequest } from './requests';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, RefreshTokenGuard } from './guards';
import { Request } from 'express';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiBody({
    type: LoginRequest,
  })
  signIn(@Body() request: LoginRequest) {
    return this.authService.login(request.email, request.password);
  }

  @Post('setup')
  setup(
    @Body() request: { email: string; resetToken: string; password: string },
  ) {
    return this.authService.authSetup(request.resetToken, request.password);
  }

  @Post('firstTimeSetup')
  firstTimeSetup(@Body() request: RegisterRequest) {
    return this.authService.firstTimeSetup(
      request.email,
      request.password,
      request.firstName,
      request.lastName,
    );
  }

  @UseGuards(RefreshTokenGuard)
  @Get('refresh')
  @ApiBearerAuth()
  refreshTokens(@Req() req: Request) {
    const userId = req['user']['sub'];
    const refreshToken = req['user']['refreshToken'];

    return this.authService.refreshTokens(userId, refreshToken);
  }

  @UseGuards(AccessTokenGuard)
  @Get('logout')
  @ApiBearerAuth()
  logout(@Req() req: Request) {
    return this.authService.logout(req['user']['sub']).then(() => true);
  }

  @Post('forgot')
  forgot(@Body() request: { email: string }) {
    console.log('In forgot');
    return this.authService.sendPasswordReset(request.email);
  }

  @Post('reset')
  reset(
    @Body() request: { email: string; resetToken: string; newPassword: string },
  ) {
    return this.authService.resetPassword(
      request.email,
      request.resetToken,
      request.newPassword,
    );
  }
}

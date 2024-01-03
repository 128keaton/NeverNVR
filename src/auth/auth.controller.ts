import {
  Body,
  Controller,
  // Get,
  HttpCode,
  HttpStatus,
  Post,
  // Req,
  // UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequest } from './requests';
// import { AccessTokenGuard, RefreshTokenGuard } from './guards';
// import { Request } from 'express';

@Controller('')
export class AuthController {
  constructor(private authService: AuthService) {}
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() request: LoginRequest) {
    return this.authService.login(request.email, request.password);
  }

  @Post('setup')
  setup(
    @Body() request: { email: string; resetToken: string; password: string },
  ) {
    return this.authService.authSetup(request.resetToken, request.password);
  }

  // @UseGuards(RefreshTokenGuard)
  // @Get('refresh')
  // refreshTokens(@Req() req: Request) {
  //   const userId = req.user['sub'];
  //   const refreshToken = req.user['refreshToken'];
  //
  //   return this.authService.refreshTokens(userId, refreshToken);
  // }
  //
  // @UseGuards(AccessTokenGuard)
  // @Get('logout')
  // logout(@Req() req: Request) {
  //   return this.authService.logout(req.user['sub']).then(() => true);
  // }
}

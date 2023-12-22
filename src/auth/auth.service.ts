import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  // HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';
// import { Server } from 'socket.io';
// import { WebSocketAuthMiddleware } from './middleware/websocket-auth.middleware';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpStatusCode } from 'axios';
import { UsersService } from 'src/users/users.service';
import { AppHelpers } from 'src/app.helpers';

@Injectable()
export class AuthService {
  private logger = new Logger('AuthService');

  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
    // private middleware: WebSocketAuthMiddleware,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new BadRequestException('User does not exist');
    // if (!user.emailVerified) throw new BadRequestException('User not verified');
    if (!bcrypt.compare(password, user.password))
      throw new BadRequestException('Password is incorrect');

    return user;
  }

  async validateUserResetToken(
    email: string,
    resetToken: string,
  ): Promise<User> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new BadRequestException('User does not exist');

    if (!bcrypt.compare(resetToken, user.passwordResetToken))
      throw new BadRequestException('Token is incorrect');

    return user;
  }

  async loginDemo() {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: 'demo',
          email: 'demo@copcart.com',
          type: 'access',
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: 'demo',
          email: 'demo@copcart.com',
          type: 'refresh',
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        name: 'Demo User',
        email: 'demo@copcart.com',
        id: 'demo',
      },
    };
  }

  async resetPassword(email: string, resetToken: string, newPassword: string) {
    let user = await this.validateUserResetToken(email, resetToken);
    user = await this.usersService.updatePassword(user.id, newPassword);

    return this.login(user.email, newPassword);
  }

  async authSetup(resetToken: string, password: string) {
    let user = await this.usersService.findOneByResetToken(resetToken);
    user = await this.usersService.updatePassword(user.id, password);
    return this.login(user.email, password);
  }

  async sendPasswordReset(email: string) {
    const user = await this.usersService.findOneByEmail(email);

    if (!user)
      throw new HttpException('User does not exist', HttpStatusCode.NotFound);

    if (!!user.passwordResetToken && user.passwordResetToken.length > 0)
      throw new HttpException('Email already sent', HttpStatusCode.BadRequest);

    return this.usersService.sendPasswordReset(user.id);
  }

  async login(email: string, password: string): Promise<any> {
    const user = await this.validateUser(email, password);
    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        id: user.id,
      },
    };
  }

  async updateRefreshToken(userID: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    if (AppHelpers.validateUserID(userID)) {
      await this.usersService.update(userID, {
        refreshToken: hashedRefreshToken,
      });
    }
  }

  async getTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          type: 'access',
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          type: 'refresh',
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(userID: string, refreshToken: string) {
    let tokens;

    if (!AppHelpers.validateUserID(userID)) {
      // DEMO mode
      tokens = await this.getTokens(userID, 'demo@copcart.com');
    } else {
      const user = await this.usersService.getRefreshTokensPasswordByID(userID);

      if (!user || !user.refreshToken)
        throw new ForbiddenException('Access Denied');

      const refreshTokenMatches = bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );

      if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');
      tokens = await this.getTokens(user.id, user.email);
    }

    await this.updateRefreshToken(userID, tokens.refreshToken);
    return tokens;
  }

  async logout(userID: string) {
    return this.usersService.update(userID, { refreshToken: null });
  }

  // applyMiddleware(server: Server) {
  //   server.use(this.middleware.middleware);
  // }
}

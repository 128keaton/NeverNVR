import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpStatusCode } from 'axios';
import { UsersService } from 'src/users/users.service';
import { AppHelpers } from 'src/app.helpers';

@Injectable()
export class AuthService {
  private apiKey?: string;

  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    this.apiKey = this.configService.get('API_KEY');
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new BadRequestException('User does not exist');

    if (!(await bcrypt.compare(password, user.password)))
      throw new BadRequestException('Password is incorrect');

    return user;
  }

  verifyApiKey(apiKey: string) {
    if (!this.apiKey) return false;

    return apiKey === this.apiKey;
  }

  async firstTimeSetup(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) {
    const totalUsers = await this.usersService.getTotalUsers();

    if (totalUsers > 0)
      throw new HttpException(
        'Initial user already created',
        HttpStatusCode.Forbidden,
      );

    const user = await this.usersService.create({
      email,
      firstName,
      lastName,
      password,
      roles: ['ADMIN'],
    });

    if (!user)
      throw new HttpException(
        'Could not create initial user',
        HttpStatusCode.BadRequest,
      );

    return this.login(user.email, password);
  }

  async validateUserResetToken(
    email: string,
    resetToken: string,
  ): Promise<User> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new BadRequestException('User does not exist');

    if (!(await bcrypt.compare(resetToken, user.passwordResetToken)))
      throw new BadRequestException('Token is incorrect');

    return user;
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
    const roleEnums: Role[] = user.roles;
    const roles: string[] = roleEnums.map((role) => Role[role]);
    const tokens = await this.getTokens(user.id, user.email, roles);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        id: user.id,
        roles: roles,
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

  async getTokens(userId: string, email: string, roles: string[]) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          type: 'access',
          roles,
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
          roles,
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
    const user = await this.usersService.getRefreshTokensPasswordByID(userID);
    const roleEnums: Role[] = user.roles;
    const roles: string[] = roleEnums.map((role) => Role[role]);

    if (!user || !user.refreshToken)
      throw new ForbiddenException('Access Denied');

    const refreshTokenMatches = bcrypt.compare(refreshToken, user.refreshToken);

    if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');
    const tokens = await this.getTokens(user.id, user.email, roles);

    await this.updateRefreshToken(userID, tokens.refreshToken);
    return tokens;
  }

  async logout(userID: string) {
    return this.usersService.update(userID, { refreshToken: null });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import {
  NovuMessagesService,
  NovuSubscribersService,
} from '../services/novu/services';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  private logger = new Logger(UsersService.name);
  private readonly securityEmail = 'email@copcart.com';
  private readonly frontendURL = 'http://localhost:4200';

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
    private novuSubscribersService: NovuSubscribersService,
    private novuMessagesService: NovuMessagesService,
  ) {
    this.securityEmail =
      this.configService.get('SECURITY_EMAIL') || 'email@copcart.com';
    this.frontendURL =
      this.configService.get('FRONTEND_URL') || 'http://localhost:4200';
  }

  private async sendSetupEmail(
    user: { id: string; email: string },
    resetToken?: string,
  ) {
    let passwordResetToken = resetToken;
    let hashedToken;

    if (!passwordResetToken || !passwordResetToken.length) {
      passwordResetToken = Math.random().toString(36).slice(-8);
      hashedToken = await bcrypt.hash(passwordResetToken, 10);
      await this.prismaService.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordResetToken: hashedToken,
        },
      });
    }

    const setupLink = `${this.frontendURL}/auth/setup?token=${passwordResetToken}`;
    this.logger.verbose(`Sending setup email to ${user.email}`);

    return this.novuMessagesService.triggerEmail(
      'account-setup',
      user.id,
      user.email,
      {
        securityEmail: this.securityEmail,
        setupLink,
      },
    );
  }

  async create(request: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
  }) {
    let hashedPassword;

    if (!!request.password && request.password.length) {
      hashedPassword = await bcrypt.hash(request.password, 10);
    } else {
      this.logger.verbose(
        'Password was not supplied so we are generating one along with a reset token',
      );

      const randomPassword = Math.random().toString(36).slice(-8);
      hashedPassword = await bcrypt.hash(randomPassword, 10);
    }

    const randomToken = Math.random().toString(36).slice(-8);
    const resetToken = await bcrypt.hash(randomToken, 10);

    const user = await this.prismaService.extended.user.create({
      data: {
        email: request.email,
        password: hashedPassword,
        firstName: request.firstName,
        lastName: request.lastName,
        passwordResetToken: resetToken,
      },
    });

    if (!user) {
      this.logger.verbose('User was not created for some reason');
      return user;
    }

    // Identify the user on the Novu backend
    await this.novuSubscribersService.initialIdentification(
      user.id,
      user.email,
      request.firstName,
      request.lastName,
    );

    await this.sendSetupEmail(user, resetToken);
    return user;
  }
}

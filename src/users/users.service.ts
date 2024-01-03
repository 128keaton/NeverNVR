import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
import {
  NovuMessagesService,
  NovuSubscribersService,
} from '../services/novu/services';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';
import { createPaginator } from 'prisma-pagination';

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

  findOneByID(id: string) {
    if (!id) return undefined;

    return this.prismaService.extended.user.findFirst({
      where: {
        id,
      },
    });
  }

  update(
    id: string,
    update: {
      firstName?: string;
      lastName?: string;
      refreshToken?: string;
    },
  ) {
    return this.prismaService.extended.user.update({
      where: {
        id,
      },
      data: update,
    });
  }

  async getRefreshTokensPasswordByID(id: string) {
    if (!id) return undefined;

    return this.prismaService.extended.user.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        email: true,
        password: true,
        refreshToken: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  async findOneByResetToken(resetToken: string): Promise<User | undefined> {
    if (!resetToken) return undefined;

    return this.prismaService.extended.user.findFirst({
      where: {
        passwordResetToken: {
          equals: resetToken,
        },
      },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        id: true,
        refreshToken: true,
        passwordResetToken: true,
        createdAt: true,
        lastLogin: true,
      },
    });
  }

  async findOneByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;

    return this.prismaService.extended.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        id: true,
        refreshToken: true,
        passwordResetToken: true,
        createdAt: true,
        lastLogin: true,
      },
    });
  }

  async updatePassword(id: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prismaService.extended.user.update({
      where: {
        id,
      },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
      },
    });
  }

  async sendPasswordReset(userID: string) {
    const resetToken = Math.random().toString(36).slice(-8);
    const passwordResetToken = await bcrypt.hash(resetToken, 10);

    const user = await this.prismaService.extended.user.update({
      where: {
        id: userID,
      },
      data: {
        passwordResetToken,
      },
      select: {
        email: true,
      },
    });

    const resetLink = `${this.frontendURL}/auth/password/reset?token=${resetToken}`;
    const didSend = await this.novuMessagesService
      .triggerEmail('password-reset', userID, user.email, {
        resetLink,
        securityEmail: this.securityEmail,
      })
      .then(() => true)
      .catch((err) => {
        this.logger.error(err);
        return false;
      });

    return { success: didSend };
  }

  getUsers(request: {
    pageSize?: number;
    pageNumber?: number;
    search?: string;
  }) {
    const paginate = createPaginator({ perPage: request.pageSize || 20 });

    let where = {};

    if (!!request.search) {
      where = {
        OR: [
          {
            name: {
              contains: request.search,
            },
          },
          {
            email: {
              contains: request.search,
            },
          },
        ],
      };
    }

    return paginate<User, Prisma.UserFindManyArgs>(
      this.prismaService.extended.user,
      {
        where,
        orderBy: {
          id: 'desc',
        },
      },
      { page: request.pageNumber },
    );
  }

  async delete(id: string) {
    const deleted = await this.prismaService.extended.user.delete({
      where: {
        id,
      },
    });
    return { deleted: deleted, id };
  }
}

import { PrismaClient } from '@prisma/client';
import { isArray } from 'class-validator';

const removePassword = (result: any, rawArguments: any) => {
  if (!!result && result.hasOwnProperty('password')) {
    if (
      !rawArguments.hasOwnProperty('select') ||
      !rawArguments['select'].hasOwnProperty('password')
    ) {
      delete (result as any)['password'];
    }
  }
};

const removeRefreshToken = (result: any, rawArguments: any) => {
  if (!!result && result.hasOwnProperty('refreshToken')) {
    if (
      !rawArguments.hasOwnProperty('select') ||
      !rawArguments['select'].hasOwnProperty('refreshToken')
    ) {
      delete (result as any)['refreshToken'];
    }
  }
};

export const createPrismaExtended = (prisma: PrismaClient) =>
  prisma.$extends({
    query: {
      user: {
        async $allOperations({ args, query }) {
          const rawArguments: { [key: string]: any } = args as unknown as any;
          const result = await query(args);

          if (isArray(result)) {
            result.forEach((user) => {
              removePassword(user, rawArguments);
              removeRefreshToken(user, rawArguments);
            });
          } else {
            removePassword(result, rawArguments);
            removeRefreshToken(result, rawArguments);
          }

          return result;
        },
      },
    },
    result: {
      user: {
        hasPasswordResetToken: {
          needs: {
            passwordResetToken: true,
          },
          compute(user): boolean {
            return !!user.passwordResetToken;
          },
        },
      },
    },
  });

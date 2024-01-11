import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../types';
import { Request } from 'express';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    const isDevelopment =
      (configService.get('NODE_ENV') || 'production') === 'development';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: isDevelopment,
      secretOrKey: configService.getOrThrow('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  // noinspection JSUnusedGlobalSymbols
  validate(req: Request, payload: JwtPayload) {
    if (payload.type === 'access') {
      return payload;
    }

    return null;
  }
}

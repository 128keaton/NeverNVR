import { PassportStrategy } from '@nestjs/passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { AuthService } from '../auth.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy,
  'api-key',
) {
  constructor(private authService: AuthService) {
    super({ header: 'api-key', prefix: '' }, true, (apiKey, verified) => {
      if (this.authService.verifyApiKey(apiKey)) verified(null, true);
      else verified(new UnauthorizedException(), null);
    });
  }
}

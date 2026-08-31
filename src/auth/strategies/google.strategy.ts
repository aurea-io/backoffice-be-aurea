import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID:
        configService.get<string>('GOOGLE_CLIENT_ID') || 'aurea-google-client-id-placeholder',
      clientSecret:
        configService.get<string>('GOOGLE_CLIENT_SECRET') || 'aurea-google-client-secret-placeholder',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3001/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos, id } = profile;
    const user = {
      googleId: id,
      email: emails[0]?.value?.toLowerCase(),
      name: `${name?.givenName || ''} ${name?.familyName || ''}`.trim() || emails[0]?.value,
      avatarUrl: photos[0]?.value,
    };
    done(null, user);
  }
}

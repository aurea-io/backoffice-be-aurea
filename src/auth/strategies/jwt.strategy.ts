import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SystemConstants } from '../../core/constants/index.js';
import type { JwtPayload } from '../../core/interfaces/context.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const configuredSecret = configService.get<string>('JWT_ACCESS_SECRET')?.trim();
    const secret = configuredSecret || SystemConstants.DEFAULT_JWT_SECRET;
    if (!configuredSecret && configService.get<string>('NODE_ENV') === 'production') {
      throw new Error('JWT_ACCESS_SECRET must be configured in production.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid authentication token.');
    }
    return { sub: payload.sub, email: payload.email };
  }
}

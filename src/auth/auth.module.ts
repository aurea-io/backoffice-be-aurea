import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { GoogleStrategy } from './strategies/google.strategy.js';
import { InvitationsModule } from '../invitations/invitations.module.js';
import { SystemConstants, AuthConstants } from '../core/constants/index.js';

@Module({
  imports: [
    InvitationsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: getJwtSecret(config),
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES_IN') ||
            AuthConstants.DEFAULT_JWT_ACCESS_EXPIRATION) as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}

function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_ACCESS_SECRET')?.trim();
  if (secret) return secret;
  if (config.get<string>('NODE_ENV') === 'production') {
    throw new Error('JWT_ACCESS_SECRET must be configured in production.');
  }
  return SystemConstants.DEFAULT_JWT_SECRET;
}

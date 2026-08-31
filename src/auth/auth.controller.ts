import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Headers,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import {
  LoginDto,
  RegisterDto,
  RequestMagicLinkDto,
  VerifyMagicLinkDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto/index.js';
import { Public } from '../core/decorators/public.decorator.js';
import { CurrentUser } from '../core/decorators/current-user.decorator.js';
import { AuthConstants } from '../core/constants/index.js';
import type { JwtPayload } from '../core/interfaces/context.interface.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(res, result.refreshToken, result.refreshExpiresInMs);
    return {
      accessToken: result.accessToken,
      user: result.user,
      tenants: result.tenants,
    };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.refreshToken, result.refreshExpiresInMs);
    return {
      accessToken: result.accessToken,
      user: result.user,
      tenants: result.tenants,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Body('refreshToken') bodyToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = (req.cookies?.[AuthConstants.REFRESH_COOKIE_NAME] || bodyToken) as
      | string
      | undefined;

    if (!rawToken) {
      throw new UnauthorizedException('Refresh token was not found.');
    }

    const result = await this.authService.refresh(rawToken);
    this.setRefreshCookie(res, result.refreshToken, result.refreshExpiresInMs);
    return {
      accessToken: result.accessToken,
      user: result.user,
      tenants: result.tenants,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Body('refreshToken') bodyToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = (req.cookies?.[AuthConstants.REFRESH_COOKIE_NAME] || bodyToken) as
      | string
      | undefined;

    if (rawToken) {
      await this.authService.logout(rawToken);
    }
    this.clearRefreshCookie(res);
  }

  @Get('me')
  async getMe(
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.authService.validateUserContext(user.sub, tenantId);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.sub, dto);
  }

  // ── Magic Links ──────────────────────────────────────────────────────────

  @Public()
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  async requestMagicLink(@Body() dto: RequestMagicLinkDto) {
    await this.authService.requestMagicLink(dto);
    return {
      message:
        'If the email is registered, you will receive a magic login link shortly.',
    };
  }

  @Public()
  @Post('magic-link/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMagicLink(
    @Body() dto: VerifyMagicLinkDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyMagicLink(dto);
    this.setRefreshCookie(res, result.refreshToken, result.refreshExpiresInMs);
    return {
      accessToken: result.accessToken,
      user: result.user,
      tenants: result.tenants,
    };
  }

  // ── Password Reset ───────────────────────────────────────────────────────

  @Public()
  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(dto);
    return {
      message:
        'If the email is registered, you will receive instructions to reset your password.',
    };
  }

  @Public()
  @Post('password-reset/verify')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ── Cookie Helpers ───────────────────────────────────────────────────────

  private setRefreshCookie(res: Response, token: string, maxAgeMs: number) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie(AuthConstants.REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: maxAgeMs,
      path: '/',
    });
  }

  private clearRefreshCookie(res: Response) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    res.clearCookie(AuthConstants.REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });
  }
}

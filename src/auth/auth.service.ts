import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  UserRepository,
  AuthTokenRepository,
  TenantRepository,
} from '../repositories/index.js';
import { InvitationsService } from '../invitations/invitations.service.js';
import {
  AuthConstants,
  SystemConstants,
  TokenTypeConstants,
  RoleConstants,
} from '../core/constants/index.js';
import type {
  LoginDto,
  RegisterDto,
  RequestMagicLinkDto,
  VerifyMagicLinkDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto/index.js';
import type { JwtPayload } from '../core/interfaces/context.interface.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly authTokenRepo: AuthTokenRepository,
    private readonly tenantRepo: TenantRepository,
    private readonly invitationsService: InvitationsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ── Authentication Flows ──────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userRepo.findWithMembershipsByEmail(email);

    await this.verifyPassword(dto.password, user?.passwordHash);

    if (!user || !user.active) {
      throw new UnauthorizedException('Incorrect email address or password.');
    }

    await this.authTokenRepo.deleteExpiredTokens(user.id);
    return this.issueTokens(user.id, user.email, user.name, user.memberships);
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    await this.ensureEmailIsAvailable(email);

    // 1. Validate invitation code
    const invitation = await this.invitationsService.validateCode(
      dto.invitationCode,
      email,
    );

    // 2. Create user
    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.userRepo.create({
      email,
      name: dto.name,
      passwordHash,
      avatarUrl: dto.avatarUrl,
    });

    // 3. Assign tenant membership if invitation is attached to a tenant
    let memberships: any[] = [];
    if (invitation.tenantId) {
      const membership = await this.tenantRepo.upsertMembership(
        invitation.tenantId,
        user.id,
        invitation.role,
      );
      memberships = [membership];
    }

    // 4. Mark invitation as used
    await this.invitationsService.markAsUsed(invitation.id);

    this.logger.log(`New user registered via invitation: ${user.email} (Role: ${invitation.role})`);
    return this.issueTokens(user.id, user.email, user.name, memberships);
  }

  async googleLogin(googleProfile: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    const email = googleProfile.email.toLowerCase().trim();
    let user = await this.userRepo.findWithMembershipsByEmail(email);

    if (!user) {
      // Auto-create user from Google
      const created = await this.userRepo.create({
        email,
        name: googleProfile.name || email.split('@')[0],
        googleId: googleProfile.googleId,
        avatarUrl: googleProfile.avatarUrl,
      });

      user = await this.userRepo.findWithMembershipsByEmail(email);
    } else if (!user.googleId) {
      await this.userRepo.update(user.id, {
        googleId: googleProfile.googleId,
        avatarUrl: user.avatarUrl || googleProfile.avatarUrl,
      });
    }

    if (!user || !user.active) {
      throw new UnauthorizedException('User account is disabled.');
    }

    return this.issueTokens(user.id, user.email, user.name, user.memberships);
  }

  async refresh(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token was not provided.');
    }

    const storedToken = await this.findStoredRefreshToken(rawRefreshToken);
    await this.validateRefreshTokenState(storedToken);

    await this.authTokenRepo.burnToken(storedToken.id);

    return this.issueTokens(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.name,
      storedToken.user.memberships,
    );
  }

  async logout(rawRefreshToken?: string) {
    if (!rawRefreshToken) return;
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.authTokenRepo
      .revokeAllUserTokensByType(tokenHash, TokenTypeConstants.REFRESH_TOKEN)
      .catch(() => {});
  }

  // ── Magic Link Flows ─────────────────────────────────────────────────────

  async requestMagicLink(dto: RequestMagicLinkDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userRepo.findActiveByEmail(email);

    if (!user) {
      return { sent: true }; // Prevent email enumeration
    }

    const rawToken = await this.createAuthTokenRecord(
      user.id,
      TokenTypeConstants.MAGIC_LINK,
      AuthConstants.MAGIC_LINK_EXPIRATION_MS,
    );

    this.logger.log(`Magic link generated for ${email}: token=${rawToken}`);
    return { sent: true };
  }

  async verifyMagicLink(dto: VerifyMagicLinkDto) {
    const token = await this.findAndValidateToken(dto.token, TokenTypeConstants.MAGIC_LINK);
    await this.authTokenRepo.burnToken(token.id);

    await this.authTokenRepo.deleteExpiredTokens(token.user.id);
    return this.issueTokens(
      token.user.id,
      token.user.email,
      token.user.name,
      token.user.memberships,
    );
  }

  // ── Password Reset Flows ─────────────────────────────────────────────────

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userRepo.findActiveByEmail(email);

    if (!user) {
      return { sent: true };
    }

    const rawToken = await this.createAuthTokenRecord(
      user.id,
      TokenTypeConstants.PASSWORD_RESET,
      AuthConstants.PASSWORD_RESET_EXPIRATION_MS,
    );

    this.logger.log(`Password reset token generated for ${email}: token=${rawToken}`);
    return { sent: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const token = await this.findAndValidateToken(dto.token, TokenTypeConstants.PASSWORD_RESET);
    const newPasswordHash = await this.hashPassword(dto.newPassword);

    await this.authTokenRepo.updateUserPasswordAndBurnToken(
      token.user.id,
      token.id,
      newPasswordHash,
    );
    await this.authTokenRepo.revokeAllUserTokensByType(
      token.user.id,
      TokenTypeConstants.REFRESH_TOKEN,
    );

    return { success: true, message: 'Password updated successfully.' };
  }

  // ── Profile and Multi-Tenant Context ─────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.userRepo.update(userId, {
      name: dto.name ? dto.name.trim() : undefined,
      avatarUrl: dto.avatarUrl,
    });
  }

  async validateUserContext(userId: string, tenantId?: string) {
    const user = await this.userRepo.findWithTenantFeatures(userId);
    if (!user || !user.active) {
      throw new UnauthorizedException('User not found or inactive.');
    }

    const isAureaSuperadmin = user.memberships.some(
      (m) => m.role === RoleConstants.SUPERADMIN && m.isActive,
    );

    const currentContext = tenantId
      ? await this.resolveTenantContext(user, tenantId, isAureaSuperadmin)
      : null;

    const allTenants = this.formatUserTenants(user.memberships);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isAureaSuperadmin,
      },
      currentContext,
      allTenants,
    };
  }

  // ── Modular Query & Validation Helpers ────────────────────────────────────

  private async ensureEmailIsAvailable(email: string) {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }
  }

  private async verifyPassword(plainPassword: string, hashToCheck?: string | null) {
    const hash = hashToCheck ?? AuthConstants.DUMMY_PASSWORD_HASH;
    return bcrypt.compare(plainPassword, hash);
  }

  private async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, AuthConstants.BCRYPT_ROUNDS);
  }

  // ── Token Management Helpers ─────────────────────────────────────────────

  private async findStoredRefreshToken(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const storedToken = await this.authTokenRepo.findByTokenHash(tokenHash);

    if (!storedToken || storedToken.type !== TokenTypeConstants.REFRESH_TOKEN) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    return storedToken;
  }

  private async validateRefreshTokenState(storedToken: any) {
    if (storedToken.used || storedToken.revokedAt) {
      this.logger.warn(
        `Refresh token reuse detected for user ${storedToken.userId}. Revoking sessions.`,
      );
      await this.authTokenRepo.revokeAllUserTokensByType(
        storedToken.userId,
        TokenTypeConstants.REFRESH_TOKEN,
      );
      throw new UnauthorizedException('Invalid session. Please sign in again.');
    }

    if (storedToken.expiresAt < new Date()) {
      await this.authTokenRepo.burnToken(storedToken.id);
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    if (!storedToken.user.active) {
      throw new UnauthorizedException('User account is deactivated.');
    }
  }

  private async findAndValidateToken(rawToken: string, expectedType: string) {
    const tokenHash = this.hashToken(rawToken);
    const token = await this.authTokenRepo.findByTokenHash(tokenHash);

    const isInvalid =
      !token ||
      token.used ||
      token.revokedAt ||
      token.type !== expectedType ||
      token.expiresAt < new Date();

    if (isInvalid) {
      throw new BadRequestException('Security token is invalid or has expired.');
    }

    if (!token.user.active) {
      throw new BadRequestException('User account is deactivated.');
    }

    return token;
  }

  private async createAuthTokenRecord(userId: string, type: string, durationMs: number) {
    const rawToken = crypto.randomBytes(AuthConstants.OPAQUE_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + durationMs);

    await this.authTokenRepo.create({
      userId,
      tokenHash,
      type,
      expiresAt,
    });

    return rawToken;
  }

  // ── Context Resolvers ────────────────────────────────────────────────────

  private async resolveTenantContext(user: any, tenantId: string, isSuperadmin: boolean) {
    const membership = user.memberships.find(
      (m: any) => m.tenantId === tenantId && m.tenant.isActive,
    );

    if (membership) {
      return {
        tenantId: membership.tenant.id,
        slug: membership.tenant.slug,
        name: membership.tenant.name,
        vertical: membership.tenant.vertical,
        role: membership.role,
        permissions: membership.permissions,
        activeFeatures: membership.tenant.features
          .filter((f: any) => f.isEnabled)
          .map((f: any) => f.featureKey),
        maintenanceMode: membership.tenant.maintenanceMode,
        maintenanceMessage: membership.tenant.maintenanceMessage,
        deprecatedAt: membership.tenant.deprecatedAt,
        publicAccessUntil: membership.tenant.publicAccessUntil,
      };
    }

    if (isSuperadmin) {
      const tenant = await this.tenantRepo.findById(tenantId);

      if (tenant && tenant.isActive) {
        return {
          tenantId: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          vertical: tenant.vertical,
          role: RoleConstants.SUPERADMIN,
          permissions: [RoleConstants.ALL_PERMISSIONS],
          activeFeatures: tenant.features
            .filter((f: any) => f.isEnabled)
            .map((f: any) => f.featureKey),
        };
      }
    }

    throw new UnauthorizedException('You do not have access to this tenant.');
  }

  private formatUserTenants(memberships: any[]) {
    return memberships
      .filter((m) => m.tenant?.isActive)
      .map((m) => ({
        tenantId: m.tenant.id,
        slug: m.tenant.slug,
        name: m.tenant.name,
        vertical: m.tenant.vertical,
        role: m.role,
      }));
  }

  // ── Token Issuance Helpers ───────────────────────────────────────────────

  private async issueTokens(
    userId: string,
    email: string,
    name: string,
    memberships: any[],
  ) {
    const payload: JwtPayload = { sub: userId, email };
    const accessToken = await this.generateAccessToken(payload);
    const { rawRefreshToken, maxAgeMs } = await this.generateAndStoreRefreshToken(userId);

    const isAureaSuperadmin = memberships.some(
      (m) => m.role === RoleConstants.SUPERADMIN && m.isActive,
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      refreshExpiresInMs: maxAgeMs,
      user: {
        id: userId,
        email,
        name,
        isAureaSuperadmin,
      },
      tenants: this.formatUserTenants(memberships),
    };
  }

  private async generateAccessToken(payload: JwtPayload): Promise<string> {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET')?.trim();
    if (!secret && this.configService.get<string>('NODE_ENV') === 'production') {
      throw new Error('JWT_ACCESS_SECRET must be configured in production.');
    }
    const expiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ||
      AuthConstants.DEFAULT_JWT_ACCESS_EXPIRATION;

    return this.jwtService.signAsync(payload, {
      secret: secret || SystemConstants.DEFAULT_JWT_SECRET,
      expiresIn: expiresIn as any,
    });
  }

  private async generateAndStoreRefreshToken(userId: string) {
    const rawRefreshToken = crypto
      .randomBytes(AuthConstants.REFRESH_TOKEN_BYTES)
      .toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const duration =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
      AuthConstants.DEFAULT_JWT_REFRESH_EXPIRATION;
    const { expiresAt, maxAgeMs } = this.computeExpiry(duration);

    await this.authTokenRepo.create({
      userId,
      tokenHash,
      type: TokenTypeConstants.REFRESH_TOKEN,
      expiresAt,
    });

    return { rawRefreshToken, maxAgeMs };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private computeExpiry(duration: string): { expiresAt: Date; maxAgeMs: number } {
    const now = new Date();
    const date = new Date(now);
    const match = duration.match(/^(\d+)([dhm])$/);
    if (!match) {
      date.setDate(date.getDate() + 7);
      return { expiresAt: date, maxAgeMs: date.getTime() - now.getTime() };
    }
    const n = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === 'd') date.setDate(date.getDate() + n);
    if (unit === 'h') date.setHours(date.getHours() + n);
    if (unit === 'm') date.setMinutes(date.getMinutes() + n);
    return { expiresAt: date, maxAgeMs: date.getTime() - now.getTime() };
  }
}

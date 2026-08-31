import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    tokenHash: string;
    type: string;
    expiresAt: Date;
  }) {
    return this.prisma.authToken.create({
      data,
    });
  }

  async findByTokenHash(tokenHash: string) {
    return this.prisma.authToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              where: { isActive: true },
              include: { tenant: true },
            },
          },
        },
      },
    });
  }

  async burnToken(id: string) {
    return this.prisma.authToken.update({
      where: { id },
      data: { used: true, revokedAt: new Date() },
    });
  }

  async updateUserPasswordAndBurnToken(
    userId: string,
    tokenId: string,
    passwordHash: string,
  ) {
    return this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.authToken.update({
        where: { id: tokenId },
        data: { used: true, revokedAt: new Date() },
      }),
    ]);
  }

  async revokeAllUserTokensByType(userId: string, type: string) {
    return this.prisma.authToken.updateMany({
      where: { userId, type, revokedAt: null },
      data: { revokedAt: new Date(), used: true },
    });
  }

  async deleteExpiredTokens(userId: string) {
    return this.prisma.authToken
      .deleteMany({
        where: {
          userId,
          expiresAt: { lt: new Date() },
        },
      })
      .catch(() => {});
  }
}

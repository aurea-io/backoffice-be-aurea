import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthConstants } from '../core/constants/index.js';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: AuthConstants.USER_SAFE_SELECT,
    });
  }

  async findActiveById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, active: true },
    });
    return user && user.active ? user : null;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findActiveByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, active: true },
    });
    return user && user.active ? user : null;
  }

  async findWithMembershipsByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { isActive: true },
          include: { tenant: true },
        },
      },
    });
  }

  async findWithTenantFeatures(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            tenant: {
              include: { features: true },
            },
          },
        },
      },
    });
  }

  async create(data: {
    email: string;
    name: string;
    passwordHash?: string;
    googleId?: string;
    avatarUrl?: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name.trim(),
        passwordHash: data.passwordHash,
        googleId: data.googleId,
        avatarUrl: data.avatarUrl,
      },
      select: AuthConstants.USER_SAFE_SELECT,
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      avatarUrl: string;
      passwordHash: string;
      googleId: string;
      active: boolean;
    }>,
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: AuthConstants.USER_SAFE_SELECT,
    });
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }
}

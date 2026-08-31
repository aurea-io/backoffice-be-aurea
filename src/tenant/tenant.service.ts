import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantRepository, UserRepository } from '../repositories/index.js';
import type { UpdateTenantSettingsDto } from './dto/update-settings.dto.js';

@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepo: TenantRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async getTenantContext(tenantId: string) {
    const tenant = await this.tenantRepo.findById(tenantId);

    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Tenant not found or inactive.');
    }

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      vertical: tenant.vertical,
      settings: tenant.settings ?? {},
      activeFeatures: tenant.features
        .filter((f) => f.isEnabled)
        .map((f) => f.featureKey),
    };
  }

  async updateSettings(tenantId: string, dto: UpdateTenantSettingsDto) {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    const currentSettings = (tenant.settings as Record<string, any>) ?? {};
    const updatedSettings = dto.settings
      ? { ...currentSettings, ...dto.settings }
      : currentSettings;

    return this.tenantRepo.update(tenantId, {
      name: dto.name ? dto.name.trim() : undefined,
      settings: updatedSettings,
    });
  }

  async getMembers(tenantId: string) {
    return this.tenantRepo.findMembershipsByTenantId(tenantId);
  }

  async addMember(tenantId: string, email: string, role: Role = Role.STAFF) {
    const targetEmail = email.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(targetEmail);

    if (!user) {
      throw new BadRequestException(
        `User '${targetEmail}' must register on the platform first.`,
      );
    }

    return this.tenantRepo.upsertMembership(tenantId, user.id, role);
  }
}

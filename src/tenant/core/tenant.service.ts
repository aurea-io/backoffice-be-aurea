import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantRepository, UserRepository } from '../../repositories/index.js';
import type { UpdateTenantSettingsDto } from './dto/update-settings.dto.js';
import type { UpdateMemberDto } from './dto/update-member.dto.js';
import { validateBranding } from '../../branding/branding.validator.js';

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

    if (dto.settings) {
      try {
        validateBranding({
          primaryColor: dto.settings.primaryColor ?? dto.settings.brandColor,
          accentColor: dto.settings.accentColor,
          textColor: dto.settings.textColor,
          fontFamily: dto.settings.fontFamily,
          logoUrl: dto.settings.logoUrl,
          coverUrl: dto.settings.coverUrl,
        });
      } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : 'Branding inválido.');
      }
    }

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

  async updateMember(tenantId: string, userId: string, dto: UpdateMemberDto) {
    const membership = await this.tenantRepo.findMembership(tenantId, userId);
    if (!membership) throw new NotFoundException('Membresía no encontrada.');
    if (membership.role === Role.OWNER && ((dto.role && dto.role !== Role.OWNER) || dto.isActive === false)) {
      if (await this.tenantRepo.countActiveOwners(tenantId) <= 1) {
        throw new ConflictException('El tenant debe conservar al menos un OWNER activo.');
      }
    }
    return this.tenantRepo.updateMembership(tenantId, userId, {
      role: dto.role,
      roleKey: dto.roleKey?.trim() || undefined,
      permissions: dto.permissions,
      isActive: dto.isActive,
    });
  }

  async removeMember(tenantId: string, userId: string) {
    const membership = await this.tenantRepo.findMembership(tenantId, userId);
    if (!membership) throw new NotFoundException('Membresía no encontrada.');
    if (membership.role === Role.OWNER && await this.tenantRepo.countActiveOwners(tenantId) <= 1) {
      throw new ConflictException('No se puede remover al último OWNER activo.');
    }
    await this.tenantRepo.removeMembership(tenantId, userId);
    return { success: true, message: 'Membresía revocada.' };
  }
}

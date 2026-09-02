import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantRepository, UserRepository } from '../../repositories/index.js';
import { InvitationsService } from '../../tenant/core/invitations/invitations.service.js';
import { SystemConstants, RoleConstants } from '../../core/constants/index.js';
import type {
  CreateTenantDto,
  UpdateTenantDto,
  AssignFeatureDto,
  BatchFeaturesDto,
} from './dto/index.js';

const VERTICAL_DEFAULT_PACKAGES: Record<string, string[]> = {
  gastronomy: ['catalog', 'tables', 'delivery', 'social_hub'],
  beauty: ['catalog', 'bookings', 'social_hub', 'reviews'],
  stock: ['catalog', 'delivery', 'social_hub'],
  health: ['catalog', 'bookings', 'reviews'],
  realestate: ['catalog', 'social_hub', 'reviews'],
  general: ['catalog', 'social_hub'],
};

@Injectable()
export class SuperadminTenantsService {
  private readonly logger = new Logger(SuperadminTenantsService.name);

  constructor(
    private readonly tenantRepo: TenantRepository,
    private readonly userRepo: UserRepository,
    private readonly invitationsService: InvitationsService,
  ) {}

  // ── Tenant Queries ────────────────────────────────────────────────────────

  async findAllTenants() {
    const tenants = await this.tenantRepo.findAll();
    const invitations = await this.invitationsService.findAll(undefined, undefined, true);

    return tenants.map((t) => ({
      ...t,
      invitations: invitations.filter((inv) => inv.tenantId === t.id),
    }));
  }

  async findTenantById(id: string) {
    const tenant = await this.tenantRepo.findByIdWithDetails(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found.`);
    }

    const invitations = await this.invitationsService.findAll(undefined, id, true);

    return {
      ...tenant,
      invitations,
    };
  }

  // ── Tenant Lifecycle ──────────────────────────────────────────────────────

  async createTenant(data: CreateTenantDto) {
    const ownerEmail = data.ownerEmail.toLowerCase().trim();
    const slug = data.slug.toLowerCase().trim();
    await this.ensureSlugIsAvailable(slug);

    const vertical = data.vertical.toLowerCase().trim();
    const existingUser = await this.userRepo.findByEmail(ownerEmail);

    // 1. Resolve feature package (custom or default by vertical)
    const features =
      data.features && data.features.length > 0
        ? data.features.map((f) => f.toLowerCase().trim())
        : (VERTICAL_DEFAULT_PACKAGES[vertical] || [...SystemConstants.DEFAULT_BASE_FEATURES]);

    // 2. Create tenant
    const tenant = await this.tenantRepo.create({
      name: data.name,
      slug,
      vertical,
      settings: data.settings,
      ownerId: existingUser ? existingUser.id : undefined,
      defaultFeatures: features,
    });

    // 3. If owner doesn't exist yet, generate exclusive invitation code with role OWNER
    let invitation: any = null;
    if (!existingUser) {
      invitation = await this.invitationsService.create({
        email: ownerEmail,
        role: Role.OWNER,
        daysValid: 14,
      }, undefined, tenant.id, true);
      this.logger.log(
        `Generated OWNER invitation code for new tenant ${tenant.name}: ${invitation.code} (sent to ${ownerEmail})`,
      );
    }

    this.logger.log(
      `New tenant created: ${tenant.slug} (${tenant.name}) - Owner: ${ownerEmail} (${
        existingUser ? 'existing user' : 'invitation generated: ' + invitation?.code
      })`,
    );

    return {
      ...tenant,
      invitation,
    };
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    await this.ensureTenantExists(id);

    return this.tenantRepo.update(id, {
      name: dto.name ? dto.name.trim() : undefined,
      vertical: dto.vertical ? dto.vertical.toLowerCase().trim() : undefined,
      isActive: typeof dto.isActive === 'boolean' ? dto.isActive : undefined,
      settings: dto.settings,
    });
  }

  async deleteTenant(id: string) {
    const tenant = await this.ensureTenantExists(id);

    if (tenant.slug === SystemConstants.SYSTEM_TENANT_SLUG) {
      throw new BadRequestException('El tenant del sistema no puede ser eliminado.');
    }

    await this.tenantRepo.update(id, {
      isActive: false,
      deprecatedAt: new Date(),
      maintenanceMode: true,
      maintenanceMessage: 'Este comercio fue archivado y no acepta nuevas operaciones.',
    });
    this.logger.log(`Tenant '${tenant.name}' (${tenant.slug}) archivado.`);

    return {
      success: true,
      message: `Tenant '${tenant.name}' archivado; sus datos fueron conservados.`,
    };
  }

  // ── Feature Flag Management ───────────────────────────────────────────────

  async assignFeature(tenantId: string, dto: AssignFeatureDto) {
    await this.ensureTenantExists(tenantId);
    const featureKey = dto.featureKey.toLowerCase().trim();

    return this.tenantRepo.upsertFeature(tenantId, featureKey, dto.isEnabled);
  }

  async batchAssignFeatures(tenantId: string, dto: BatchFeaturesDto) {
    await this.ensureTenantExists(tenantId);

    const normalizedFeatures = dto.features.map((f) => ({
      featureKey: f.featureKey.toLowerCase().trim(),
      isEnabled: f.isEnabled,
    }));

    return this.tenantRepo.batchUpsertFeatures(tenantId, normalizedFeatures);
  }

  // ── Platform Roles ────────────────────────────────────────────────────────

  async grantSuperAdmin(email: string) {
    const targetEmail = email.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(targetEmail);

    if (!user) {
      throw new NotFoundException(`User with email '${targetEmail}' not found.`);
    }

    const membership = await this.tenantRepo.upsertPlatformMembership(
      user.id,
      'SUPERADMIN',
    );

    this.logger.log(`SUPERADMIN role granted globally to: ${targetEmail}`);
    return {
      success: true,
      message: `SUPERADMIN role granted successfully to ${targetEmail}`,
      user: { id: user.id, email: user.email, name: user.name },
      membership,
    };
  }

  // ── Modular Helpers ───────────────────────────────────────────────────────

  private async ensureTenantExists(id: string) {
    const tenant = await this.tenantRepo.findById(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found.`);
    }
    return tenant;
  }

  private async findOwnerByEmail(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(normalizedEmail);

    if (!user) {
      throw new BadRequestException(
        `User with email '${normalizedEmail}' does not exist. The user must register first.`,
      );
    }
    return user;
  }

  private async ensureSlugIsAvailable(slug: string) {
    const existing = await this.tenantRepo.findBySlug(slug);
    if (existing) {
      throw new ConflictException(`Tenant slug '${slug}' is already in use.`);
    }
  }
}

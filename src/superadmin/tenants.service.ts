import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantRepository, UserRepository } from '../repositories/index.js';
import { SystemConstants, RoleConstants } from '../core/constants/index.js';
import type {
  CreateTenantDto,
  UpdateTenantDto,
  AssignFeatureDto,
  BatchFeaturesDto,
} from './dto/index.js';

@Injectable()
export class SuperadminTenantsService {
  private readonly logger = new Logger(SuperadminTenantsService.name);

  constructor(
    private readonly tenantRepo: TenantRepository,
    private readonly userRepo: UserRepository,
  ) {}

  // ── Tenant Queries ────────────────────────────────────────────────────────

  async findAllTenants() {
    return this.tenantRepo.findAll();
  }

  async findTenantById(id: string) {
    const tenant = await this.tenantRepo.findByIdWithDetails(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found.`);
    }
    return tenant;
  }

  // ── Tenant Lifecycle ──────────────────────────────────────────────────────

  async createTenant(data: CreateTenantDto) {
    const owner = await this.findOwnerByEmail(data.ownerEmail);
    const slug = data.slug.toLowerCase().trim();
    await this.ensureSlugIsAvailable(slug);

    const tenant = await this.tenantRepo.create({
      name: data.name,
      slug,
      vertical: data.vertical.toLowerCase().trim(),
      settings: data.settings,
      ownerId: owner.id,
      defaultFeatures: [...SystemConstants.DEFAULT_BASE_FEATURES],
    });

    this.logger.log(`New tenant created: ${tenant.slug} (${tenant.name}) - Owner: ${owner.email}`);
    return tenant;
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

    const systemTenant = await this.tenantRepo.findOrCreateSystemTenant(
      SystemConstants.SYSTEM_TENANT_SLUG,
      SystemConstants.SYSTEM_TENANT_NAME,
      SystemConstants.SYSTEM_VERTICAL,
    );

    const membership = await this.tenantRepo.upsertMembership(
      systemTenant.id,
      user.id,
      Role.SUPERADMIN,
      [RoleConstants.ALL_PERMISSIONS],
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

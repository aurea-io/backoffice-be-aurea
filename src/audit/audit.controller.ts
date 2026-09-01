import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuditService } from './audit.service.js';
import { TenantContextGuard } from '../core/guards/tenant.guard.js';
import { RolesGuard } from '../core/guards/roles.guard.js';
import { Roles } from '../core/decorators/roles.decorator.js';
import { CurrentTenant } from '../core/decorators/tenant-context.decorator.js';
import type { TenantContext } from '../core/interfaces/context.interface.js';

@Controller('audit')
@UseGuards(TenantContextGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.OWNER)
  async list(@CurrentTenant() tenant: TenantContext, @Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    return this.auditService.listForTenant(tenant.tenantId, Number(limit) || 100, cursor);
  }
}

import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantContextGuard } from '../../../../core/guards/tenant.guard.js';
import { FeatureGuard } from '../../../../core/guards/feature.guard.js';
import { RolesGuard } from '../../../../core/guards/roles.guard.js';
import { RequireFeature } from '../../../../core/decorators/require-feature.decorator.js';
import { RequirePermissions } from '../../../../core/decorators/permissions.decorator.js';
import { Roles } from '../../../../core/decorators/roles.decorator.js';
import { CurrentTenant } from '../../../../core/decorators/tenant-context.decorator.js';
import { FeatureConstants } from '../../../../core/constants/index.js';
import type { TenantContext } from '../../../../core/interfaces/context.interface.js';
import { ClientsService } from './clients.service.js';

import { FeatureDomain } from "../../../../core/decorators/feature-domain.decorator.js";
@FeatureDomain("crm.clients")
@Controller('clients')
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard)
@RequireFeature(FeatureConstants.CLIENTS)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}
  @Get() @RequirePermissions('clients:read') list(@CurrentTenant() tenant: TenantContext, @Query('search') search?: string) { return this.clients.list(tenant.tenantId, search); }
  @Post() @Roles(Role.OWNER, Role.MANAGER) @RequirePermissions('clients:write') create(@CurrentTenant() tenant: TenantContext, @Body() input: { name: string; email?: string; phone?: string }) { return this.clients.create(tenant.tenantId, input); }
  @Post(':id/notes') @Roles(Role.OWNER, Role.MANAGER, Role.STAFF) @RequirePermissions('clients:write') addNote(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body('body') body: string) { return this.clients.addNote(tenant.tenantId, id, body); }
}

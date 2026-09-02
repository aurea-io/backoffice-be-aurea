import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantContextGuard } from '../../../core/guards/tenant.guard.js';
import { RolesGuard } from '../../../core/guards/roles.guard.js';
import { FeatureGuard } from '../../../core/guards/feature.guard.js';
import { Roles } from '../../../core/decorators/roles.decorator.js';
import { RequireFeature } from '../../../core/decorators/require-feature.decorator.js';
import { FeatureConstants } from '../../../core/constants/index.js';
import { CurrentTenant } from '../../../core/decorators/tenant-context.decorator.js';
import type { TenantContext } from '../../../core/interfaces/context.interface.js';
import { CreateInventoryDto, AdjustInventoryDto } from './dto/inventory.dto.js';
import { InventoryService } from './inventory.service.js';

@Controller('inventory')
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard)
@RequireFeature(FeatureConstants.INVENTORY)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}
  @Get() list(@CurrentTenant() tenant: TenantContext) { return this.inventory.list(tenant.tenantId); }
  @Post() @Roles(Role.OWNER, Role.MANAGER) create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateInventoryDto) { return this.inventory.create(tenant.tenantId, dto); }
  @Post(':id/adjust') @Roles(Role.OWNER, Role.MANAGER) adjust(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: AdjustInventoryDto) { return this.inventory.adjust(tenant.tenantId, id, dto); }
}

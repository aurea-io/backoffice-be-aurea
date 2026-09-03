import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
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
import { CreateCouponDto } from './coupons.dto.js';
import { CouponsService } from './coupons.service.js';

import { FeatureDomain } from "../../../../core/decorators/feature-domain.decorator.js";
@FeatureDomain("marketing.coupons")
@Controller('coupons') @UseGuards(TenantContextGuard, FeatureGuard, RolesGuard) @RequireFeature(FeatureConstants.MARKETING)
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}
  @Get() @RequirePermissions('marketing:read') list(@CurrentTenant() tenant: TenantContext) { return this.coupons.list(tenant.tenantId); }
  @Post() @Roles(Role.OWNER, Role.MANAGER) @RequirePermissions('marketing:write') create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateCouponDto) { return this.coupons.create(tenant.tenantId, dto); }
  @Delete(':id') @Roles(Role.OWNER, Role.MANAGER) @RequirePermissions('marketing:write') deactivate(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) { return this.coupons.deactivate(tenant.tenantId, id); }
}

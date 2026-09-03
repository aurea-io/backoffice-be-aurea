import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../../../core/decorators/tenant-context.decorator.js';
import type { TenantContext } from '../../../../core/interfaces/context.interface.js';
import { TenantContextGuard } from '../../../../core/guards/tenant.guard.js';
import { FeatureGuard } from '../../../../core/guards/feature.guard.js';
import { RolesGuard } from '../../../../core/guards/roles.guard.js';
import { RequireFeature } from '../../../../core/decorators/require-feature.decorator.js';
import { RequirePermissions } from '../../../../core/decorators/permissions.decorator.js';
import { FeatureConstants } from '../../../../core/constants/index.js';
import { LoyaltyOperationDto } from './loyalty.dto.js';
import { LoyaltyService } from './loyalty.service.js';

import { FeatureDomain } from "../../../../core/decorators/feature-domain.decorator.js";
@FeatureDomain("marketing.loyalty")
@Controller('loyalty')
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard)
@RequireFeature(FeatureConstants.MARKETING)
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}
  @Get() @RequirePermissions('marketing:read', 'clients:read') list(@CurrentTenant() tenant: TenantContext) { return this.loyalty.list(tenant.tenantId); }
  @Post('operations') @RequirePermissions('marketing:write', 'clients:write') operate(@CurrentTenant() tenant: TenantContext, @Body() dto: LoyaltyOperationDto) { return this.loyalty.operate(tenant.tenantId, dto); }
}

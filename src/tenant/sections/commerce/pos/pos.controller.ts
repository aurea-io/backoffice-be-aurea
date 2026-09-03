import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantContextGuard } from '../../../../core/guards/tenant.guard.js';
import { RolesGuard } from '../../../../core/guards/roles.guard.js';
import { Roles } from '../../../../core/decorators/roles.decorator.js';
import { RequireFeature } from '../../../../core/decorators/require-feature.decorator.js';
import { FeatureGuard } from '../../../../core/guards/feature.guard.js';
import { FeatureConstants } from '../../../../core/constants/index.js';
import { CurrentTenant } from '../../../../core/decorators/tenant-context.decorator.js';
import type { TenantContext } from '../../../../core/interfaces/context.interface.js';
import { CloseCashDto, OpenCashDto } from './dto/cash.dto.js';
import { PosService } from './pos.service.js';

import { FeatureDomain } from "../../../../core/decorators/feature-domain.decorator.js";
@FeatureDomain("commerce.pos")
@Controller('pos') @UseGuards(TenantContextGuard, FeatureGuard, RolesGuard)
@RequireFeature(FeatureConstants.POS)
export class PosController {
  constructor(private readonly pos: PosService) {}
  @Get('cash') current(@CurrentTenant() tenant: TenantContext) { return this.pos.current(tenant.tenantId); }
  @Post('cash/open') @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER) open(@CurrentTenant() tenant: TenantContext, @Body() dto: OpenCashDto) { return this.pos.open(tenant.tenantId, dto); }
  @Post('cash/close') @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER) close(@CurrentTenant() tenant: TenantContext, @Body() dto: CloseCashDto) { return this.pos.close(tenant.tenantId, dto); }
}

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantContextGuard } from '../../../../core/guards/tenant.guard.js';
import { RolesGuard } from '../../../../core/guards/roles.guard.js';
import { PermissionsGuard } from '../../../../core/guards/permissions.guard.js';
import { Roles } from '../../../../core/decorators/roles.decorator.js';
import {
  FeatureDomain,
  RequireRead,
  RequireWrite,
} from '../../../../core/decorators/require-feature.decorator.js';
import { FeatureGuard } from '../../../../core/guards/feature.guard.js';
import { FeatureConstants } from '../../../../core/constants/index.js';
import { CurrentTenant } from '../../../../core/decorators/tenant-context.decorator.js';
import type { TenantContext } from '../../../../core/interfaces/context.interface.js';
import { CloseCashDto, OpenCashDto } from './dto/cash.dto.js';
import { PosService } from './pos.service.js';

@Controller('pos')
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard, PermissionsGuard)
@FeatureDomain(FeatureConstants.POS)
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('cash')
  @RequireRead()
  current(@CurrentTenant() tenant: TenantContext) {
    return this.posService.current(tenant.tenantId);
  }

  @Post('cash/open')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  @RequireWrite()
  open(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: OpenCashDto,
  ) {
    return this.posService.open(tenant.tenantId, dto);
  }

  @Post('cash/close')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  @RequireWrite()
  close(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CloseCashDto,
  ) {
    return this.posService.close(tenant.tenantId, dto);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
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
import type { UpdateOrderDto } from '../orders/dto/orders.dto.js';
import { KitchenService } from './kitchen.service.js';

@Controller('restaurant')
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard, PermissionsGuard)
@FeatureDomain(FeatureConstants.KITCHEN)
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get('kitchen')
  @RequireRead()
  listKitchen(@CurrentTenant() tenant: TenantContext) {
    return this.kitchenService.listKitchenOrders(tenant.tenantId);
  }

  @Patch('kitchen/orders/:id')
  @Roles(Role.OWNER, Role.MANAGER, Role.STAFF)
  @RequireWrite()
  updateKitchenOrder(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.kitchenService.updateKitchenOrder(tenant.tenantId, id, dto);
  }
}

import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantContextGuard } from '../../../../core/guards/tenant.guard.js';
import { RolesGuard } from '../../../../core/guards/roles.guard.js';
import { Roles } from '../../../../core/decorators/roles.decorator.js';
import { RequireFeature } from '../../../../core/decorators/require-feature.decorator.js';
import { FeatureGuard } from '../../../../core/guards/feature.guard.js';
import { FeatureConstants } from '../../../../core/constants/index.js';
import { FeatureDomain } from '../../../../core/decorators/feature-domain.decorator.js';
import { CurrentTenant } from '../../../../core/decorators/tenant-context.decorator.js';
import type { TenantContext } from '../../../../core/interfaces/context.interface.js';
import { UpdateOrderDto } from '../../commerce/orders/orders.dto.js';
import { KitchenService } from './kitchen.service.js';

@FeatureDomain('gastronomy.kitchen')
@Controller(['kitchen', 'restaurant/kitchen'])
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard)
export class KitchenController {
  constructor(private readonly kitchen: KitchenService) {}

  @Get()
  @RequireFeature(FeatureConstants.KITCHEN)
  listKitchen(@CurrentTenant() tenant: TenantContext) {
    return this.kitchen.listKitchenOrders(tenant.tenantId);
  }

  @Patch('orders/:id')
  @RequireFeature(FeatureConstants.KITCHEN)
  @Roles(Role.OWNER, Role.MANAGER, Role.STAFF)
  updateKitchenOrder(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.kitchen.updateKitchenOrder(tenant.tenantId, id, dto);
  }
}

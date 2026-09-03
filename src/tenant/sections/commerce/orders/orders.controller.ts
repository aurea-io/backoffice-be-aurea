import { Body, Controller, Get, MessageEvent, Param, Patch, Post, Sse, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Role } from '@prisma/client';
import { TenantContextGuard } from '../../../../core/guards/tenant.guard.js';
import { RolesGuard } from '../../../../core/guards/roles.guard.js';
import { Roles } from '../../../../core/decorators/roles.decorator.js';
import { RequireFeature } from '../../../../core/decorators/require-feature.decorator.js';
import { FeatureGuard } from '../../../../core/guards/feature.guard.js';
import { FeatureConstants } from '../../../../core/constants/index.js';
import { FeatureDomain } from '../../../../core/decorators/feature-domain.decorator.js';
import { Public } from '../../../../core/decorators/public.decorator.js';
import { CurrentTenant } from '../../../../core/decorators/tenant-context.decorator.js';
import type { TenantContext } from '../../../../core/interfaces/context.interface.js';
import { CreateOrderDto, UpdateOrderDto } from './orders.dto.js';
import { OrdersService } from './orders.service.js';

@FeatureDomain('commerce.orders')
@Controller(['orders', 'restaurant/orders'])
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @RequireFeature(FeatureConstants.ORDERS)
  listOrders(@CurrentTenant() tenant: TenantContext) {
    return this.orders.listOrders(tenant.tenantId);
  }

  @Sse('events')
  @RequireFeature(FeatureConstants.ORDERS)
  events(@CurrentTenant() tenant: TenantContext): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      let last = '';
      const emit = async () => {
        try {
          const orders = await this.orders.listOrders(tenant.tenantId);
          const snapshot = JSON.stringify(orders.map((order) => ({ id: order.id, status: order.status, updatedAt: order.updatedAt })));
          if (snapshot !== last) {
            last = snapshot;
            subscriber.next({ type: 'orders.updated', data: orders });
          }
        } catch (error) {
          subscriber.error(error);
        }
      };
      void emit();
      const timer = setInterval(() => void emit(), 10000);
      return () => clearInterval(timer);
    });
  }

  @Post()
  @RequireFeature(FeatureConstants.ORDERS)
  createOrder(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateOrderDto) {
    return this.orders.createOrder(tenant.tenantId, dto);
  }

  @Patch(':id')
  @RequireFeature(FeatureConstants.ORDERS)
  @Roles(Role.OWNER, Role.MANAGER)
  updateOrder(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.orders.updateOrder(tenant.tenantId, id, dto);
  }

  @Get(':id/ticket')
  @RequireFeature(FeatureConstants.ORDERS)
  getOrderTicket(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.orders.getOrderTicket(tenant.tenantId, id);
  }

  @Post(':id/receipt')
  @RequireFeature(FeatureConstants.ORDERS)
  @Roles(Role.OWNER, Role.MANAGER)
  issueReceipt(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.orders.issueFiscalReceipt(tenant.tenantId, id);
  }
}

@FeatureDomain('commerce.orders')
@Controller(['public/:publicId/orders', 'public/:publicId/restaurant/orders'])
export class PublicOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Public()
  @Post()
  create(@Param('publicId') publicId: string, @Body() dto: CreateOrderDto) {
    return this.orders.createPublicOrder(publicId, dto);
  }
}

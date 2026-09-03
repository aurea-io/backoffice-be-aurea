import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Role } from '@prisma/client';
import { TenantContextGuard } from '../../../core/guards/tenant.guard.js';
import { RolesGuard } from '../../../core/guards/roles.guard.js';
import { PermissionsGuard } from '../../../core/guards/permissions.guard.js';
import { Roles } from '../../../core/decorators/roles.decorator.js';
import {
  FeatureDomain,
  RequireRead,
  RequireWrite,
} from '../../../core/decorators/require-feature.decorator.js';
import { FeatureGuard } from '../../../core/guards/feature.guard.js';
import { FeatureConstants } from '../../../core/constants/index.js';
import { CurrentTenant } from '../../../core/decorators/tenant-context.decorator.js';
import type { TenantContext } from '../../../core/interfaces/context.interface.js';
import { CreateOrderDto, UpdateOrderDto } from './dto/restaurant.dto.js';
import { RestaurantService } from './restaurant.service.js';

@Controller('restaurant')
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard, PermissionsGuard)
@FeatureDomain(FeatureConstants.ORDERS)
export class OrdersController {
  constructor(private readonly restaurant: RestaurantService) {}

  @Get('orders')
  @RequireRead()
  listOrders(@CurrentTenant() tenant: TenantContext) {
    return this.restaurant.listOrders(tenant.tenantId);
  }

  @Post('orders')
  @RequireWrite()
  createOrder(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateOrderDto,
  ) {
    return this.restaurant.createOrder(tenant.tenantId, dto);
  }

  @Patch('orders/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequireWrite()
  updateOrder(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.restaurant.updateOrder(tenant.tenantId, id, dto);
  }

  @Get('orders/:id/ticket')
  @RequireRead()
  getOrderTicket(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.restaurant.getOrderTicket(tenant.tenantId, id);
  }

  @Post('orders/:id/receipt')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequireWrite()
  issueReceipt(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.restaurant.issueFiscalReceipt(tenant.tenantId, id);
  }

  @Sse('events')
  @RequireRead()
  events(@CurrentTenant() tenant: TenantContext): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      let lastSnapshot = '';

      const emitUpdate = async () => {
        try {
          const orders = await this.restaurant.listOrders(tenant.tenantId);
          const snapshot = JSON.stringify(
            orders.map((order) => ({
              id: order.id,
              status: order.status,
              updatedAt: order.updatedAt,
            })),
          );

          if (snapshot !== lastSnapshot) {
            lastSnapshot = snapshot;
            subscriber.next({
              type: 'orders.updated',
              data: orders,
            });
          }
        } catch (error) {
          subscriber.error(error);
        }
      };

      void emitUpdate();
      const timer = setInterval(() => void emitUpdate(), 10000);
      return () => clearInterval(timer);
    });
  }
}

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
import { CreateOrderDto, UpdateOrderDto } from './dto/orders.dto.js';
import { OrdersService } from './orders.service.js';

@Controller('restaurant')
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard, PermissionsGuard)
@FeatureDomain(FeatureConstants.ORDERS)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('orders')
  @RequireRead()
  listOrders(@CurrentTenant() tenant: TenantContext) {
    return this.ordersService.listOrders(tenant.tenantId);
  }

  @Post('orders')
  @RequireWrite()
  createOrder(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(tenant.tenantId, dto);
  }

  @Patch('orders/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequireWrite()
  updateOrder(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.updateOrder(tenant.tenantId, id, dto);
  }

  @Get('orders/:id/ticket')
  @RequireRead()
  getOrderTicket(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.ordersService.getOrderTicket(tenant.tenantId, id);
  }

  @Post('orders/:id/receipt')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequireWrite()
  issueReceipt(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.ordersService.issueFiscalReceipt(tenant.tenantId, id);
  }

  @Sse('events')
  @RequireRead()
  events(@CurrentTenant() tenant: TenantContext): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      let lastSnapshot = '';

      const emitUpdate = async () => {
        try {
          const orders = await this.ordersService.listOrders(tenant.tenantId);
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

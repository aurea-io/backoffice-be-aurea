import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantContextGuard } from '../../../core/guards/tenant.guard.js';
import { RolesGuard } from '../../../core/guards/roles.guard.js';
import { Roles } from '../../../core/decorators/roles.decorator.js';
import { CurrentTenant } from '../../../core/decorators/tenant-context.decorator.js';
import type { TenantContext } from '../../../core/interfaces/context.interface.js';
import { CreateOrderDto, CreateTableDto, UpdateOrderDto, UpdateTableDto } from './dto/restaurant.dto.js';
import { RestaurantService } from './restaurant.service.js';

@Controller('restaurant') @UseGuards(TenantContextGuard, RolesGuard)
export class RestaurantController {
  constructor(private readonly restaurant: RestaurantService) {}
  @Get('tables') listTables(@CurrentTenant() tenant: TenantContext) { return this.restaurant.listTables(tenant.tenantId); }
  @Post('tables') @Roles(Role.OWNER, Role.MANAGER) createTable(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateTableDto) { return this.restaurant.createTable(tenant.tenantId, dto); }
  @Patch('tables/:id') @Roles(Role.OWNER, Role.MANAGER) updateTable(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateTableDto) { return this.restaurant.updateTable(tenant.tenantId, id, dto); }
  @Get('orders') listOrders(@CurrentTenant() tenant: TenantContext) { return this.restaurant.listOrders(tenant.tenantId); }
  @Post('orders') createOrder(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateOrderDto) { return this.restaurant.createOrder(tenant.tenantId, dto); }
  @Patch('orders/:id') @Roles(Role.OWNER, Role.MANAGER) updateOrder(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateOrderDto) { return this.restaurant.updateOrder(tenant.tenantId, id, dto); }
}

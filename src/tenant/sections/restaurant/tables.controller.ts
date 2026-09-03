import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import {
  CreateTableDto,
  UpdateTableDto,
  CreateTableBookingDto,
  UpdateTableBookingDto,
} from './dto/restaurant.dto.js';
import { RestaurantService } from './restaurant.service.js';

@Controller('restaurant')
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard, PermissionsGuard)
@FeatureDomain(FeatureConstants.TABLES)
export class TablesController {
  constructor(private readonly restaurant: RestaurantService) {}

  @Get('tables')
  @RequireRead()
  listTables(@CurrentTenant() tenant: TenantContext) {
    return this.restaurant.listTables(tenant.tenantId);
  }

  @Post('tables')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequireWrite()
  createTable(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateTableDto,
  ) {
    return this.restaurant.createTable(tenant.tenantId, dto);
  }

  @Patch('tables/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequireWrite()
  updateTable(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.restaurant.updateTable(tenant.tenantId, id, dto);
  }

  @Get('tables/:id/qr')
  @RequireRead()
  getTableQr(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.restaurant.tableQr(tenant.tenantId, id);
  }

  @Get('bookings')
  @RequireRead()
  listBookings(
    @CurrentTenant() tenant: TenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.restaurant.listTableBookings(tenant.tenantId, from, to);
  }

  @Post('bookings')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequireWrite()
  createBooking(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateTableBookingDto,
  ) {
    return this.restaurant.createTableBooking(tenant.tenantId, dto);
  }

  @Patch('bookings/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequireWrite()
  updateBooking(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateTableBookingDto,
  ) {
    return this.restaurant.updateTableBooking(tenant.tenantId, id, dto);
  }
}

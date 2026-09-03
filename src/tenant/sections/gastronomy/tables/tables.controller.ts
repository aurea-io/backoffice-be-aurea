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
import {
  CreateTableDto,
  UpdateTableDto,
  CreateTableBookingDto,
  UpdateTableBookingDto,
} from './dto/tables.dto.js';
import { TablesService } from './tables.service.js';

@Controller('restaurant')
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard, PermissionsGuard)
@FeatureDomain(FeatureConstants.TABLES)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get('tables')
  @RequireRead()
  listTables(@CurrentTenant() tenant: TenantContext) {
    return this.tablesService.listTables(tenant.tenantId);
  }

  @Post('tables')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequireWrite()
  createTable(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateTableDto,
  ) {
    return this.tablesService.createTable(tenant.tenantId, dto);
  }

  @Patch('tables/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequireWrite()
  updateTable(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tablesService.updateTable(tenant.tenantId, id, dto);
  }

  @Get('tables/:id/qr')
  @RequireRead()
  getTableQr(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.tablesService.tableQr(tenant.tenantId, id);
  }

  @Get('bookings')
  @RequireRead()
  listBookings(
    @CurrentTenant() tenant: TenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.tablesService.listTableBookings(tenant.tenantId, from, to);
  }

  @Post('bookings')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequireWrite()
  createBooking(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateTableBookingDto,
  ) {
    return this.tablesService.createTableBooking(tenant.tenantId, dto);
  }

  @Patch('bookings/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequireWrite()
  updateBooking(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateTableBookingDto,
  ) {
    return this.tablesService.updateTableBooking(tenant.tenantId, id, dto);
  }
}

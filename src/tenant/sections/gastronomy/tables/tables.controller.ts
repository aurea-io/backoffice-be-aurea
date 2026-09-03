import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { CreateTableDto, UpdateTableDto, CreateTableBookingDto, UpdateTableBookingDto } from './tables.dto.js';
import { TablesService } from './tables.service.js';

@FeatureDomain('gastronomy.tables')
@Controller(['tables', 'restaurant/tables'])
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard)
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @Get()
  @RequireFeature(FeatureConstants.TABLES)
  listTables(@CurrentTenant() tenant: TenantContext) {
    return this.tables.listTables(tenant.tenantId);
  }

  @Post()
  @RequireFeature(FeatureConstants.TABLES)
  @Roles(Role.OWNER, Role.MANAGER)
  createTable(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateTableDto) {
    return this.tables.createTable(tenant.tenantId, dto);
  }

  @Patch(':id')
  @RequireFeature(FeatureConstants.TABLES)
  @Roles(Role.OWNER, Role.MANAGER)
  updateTable(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.tables.updateTable(tenant.tenantId, id, dto);
  }

  @Get(':id/qr')
  @RequireFeature(FeatureConstants.TABLES)
  getTableQr(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.tables.tableQr(tenant.tenantId, id);
  }

  @Get('bookings')
  @RequireFeature(FeatureConstants.BOOKINGS)
  listBookings(@CurrentTenant() tenant: TenantContext, @Query('from') from?: string, @Query('to') to?: string) {
    return this.tables.listTableBookings(tenant.tenantId, from, to);
  }

  @Post('bookings')
  @RequireFeature(FeatureConstants.BOOKINGS)
  @Roles(Role.OWNER, Role.MANAGER)
  createBooking(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateTableBookingDto) {
    return this.tables.createTableBooking(tenant.tenantId, dto);
  }

  @Patch('bookings/:id')
  @RequireFeature(FeatureConstants.BOOKINGS)
  @Roles(Role.OWNER, Role.MANAGER)
  updateBooking(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateTableBookingDto) {
    return this.tables.updateTableBooking(tenant.tenantId, id, dto);
  }
}

@FeatureDomain('gastronomy.tables')
@Controller(['public/:publicId/tables/bookings', 'public/:publicId/restaurant/bookings'])
export class PublicTableBookingsController {
  constructor(private readonly tables: TablesService) {}

  @Public()
  @Get('availability')
  availability(@Param('publicId') publicId: string, @Query('date') date: string, @Query('partySize') partySize = '2') {
    return this.tables.tableBookingAvailability(publicId, date, Number(partySize) || 2);
  }

  @Public()
  @Post()
  create(@Param('publicId') publicId: string, @Body() dto: CreateTableBookingDto) {
    return this.tables.createTableBookingByPublicId(publicId, dto);
  }
}

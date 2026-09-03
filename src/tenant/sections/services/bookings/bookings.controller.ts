import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Public } from '../../../../core/decorators/public.decorator.js';
import { Roles } from '../../../../core/decorators/roles.decorator.js';
import { RolesGuard } from '../../../../core/guards/roles.guard.js';
import { TenantContextGuard } from '../../../../core/guards/tenant.guard.js';
import { FeatureGuard } from '../../../../core/guards/feature.guard.js';
import { RequireFeature } from '../../../../core/decorators/require-feature.decorator.js';
import { FeatureConstants } from '../../../../core/constants/index.js';
import { FeatureDomain } from '../../../../core/decorators/feature-domain.decorator.js';
import { CurrentTenant } from '../../../../core/decorators/tenant-context.decorator.js';
import type { TenantContext } from '../../../../core/interfaces/context.interface.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';
import { BookingsService } from './bookings.service.js';

@FeatureDomain('services.bookings')
@Controller('bookings')
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard)
@RequireFeature(FeatureConstants.BOOKINGS)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}
  @Get() list(@CurrentTenant() tenant: TenantContext, @Query('from') from?: string, @Query('to') to?: string) { return this.bookings.list(tenant.tenantId, from, to); }
  @Post() @Roles(Role.OWNER, Role.MANAGER) create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateBookingDto) { return this.bookings.create(tenant.tenantId, dto); }
  @Patch(':id') @Roles(Role.OWNER, Role.MANAGER) update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateBookingDto) { return this.bookings.update(tenant.tenantId, id, dto); }
}

@FeatureDomain('services.bookings')
@Controller('public/:publicId/bookings')
export class PublicBookingsController {
  constructor(private readonly bookings: BookingsService) {}
  @Public() @Get('availability') availability(@Param('publicId') publicId: string, @Query('date') date: string, @Query('catalogItemId') catalogItemId?: string) { return this.bookings.availability(publicId, date, catalogItemId); }
  @Public() @Post() create(@Param('publicId') publicId: string, @Body() dto: CreateBookingDto) { return this.bookings.createByPublicId(publicId, dto); }
}

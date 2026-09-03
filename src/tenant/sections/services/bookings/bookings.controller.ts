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
import { Public } from '../../../../core/decorators/public.decorator.js';
import { Roles } from '../../../../core/decorators/roles.decorator.js';
import { RolesGuard } from '../../../../core/guards/roles.guard.js';
import { PermissionsGuard } from '../../../../core/guards/permissions.guard.js';
import { TenantContextGuard } from '../../../../core/guards/tenant.guard.js';
import { FeatureGuard } from '../../../../core/guards/feature.guard.js';
import {
  FeatureDomain,
  RequireRead,
  RequireWrite,
} from '../../../../core/decorators/require-feature.decorator.js';
import { FeatureConstants } from '../../../../core/constants/index.js';
import { CurrentTenant } from '../../../../core/decorators/tenant-context.decorator.js';
import type { TenantContext } from '../../../../core/interfaces/context.interface.js';
import { CreateBookingDto, UpdateBookingDto } from './dto/index.js';
import { BookingsService } from './bookings.service.js';

@Controller('appointments')
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard, PermissionsGuard)
@FeatureDomain(FeatureConstants.BOOKINGS)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @RequireRead()
  list(
    @CurrentTenant() tenant: TenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.bookingsService.list(tenant.tenantId, from, to);
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @RequireWrite()
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(tenant.tenantId, dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequireWrite()
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(tenant.tenantId, id, dto);
  }
}

@Controller('public/:publicId/appointments')
export class PublicBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Public()
  @Get('availability')
  availability(
    @Param('publicId') publicId: string,
    @Query('date') date: string,
    @Query('catalogItemId') catalogItemId?: string,
  ) {
    return this.bookingsService.availability(publicId, date, catalogItemId);
  }

  @Public()
  @Post()
  create(
    @Param('publicId') publicId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.createByPublicId(publicId, dto);
  }
}

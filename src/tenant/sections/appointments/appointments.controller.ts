import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Public } from '../../../core/decorators/public.decorator.js';
import { Roles } from '../../../core/decorators/roles.decorator.js';
import { RolesGuard } from '../../../core/guards/roles.guard.js';
import { TenantContextGuard } from '../../../core/guards/tenant.guard.js';
import { CurrentTenant } from '../../../core/decorators/tenant-context.decorator.js';
import type { TenantContext } from '../../../core/interfaces/context.interface.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';
import { AppointmentsService } from './appointments.service.js';

@Controller('appointments')
@UseGuards(TenantContextGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}
  @Get() list(@CurrentTenant() tenant: TenantContext, @Query('from') from?: string, @Query('to') to?: string) { return this.appointments.list(tenant.tenantId, from, to); }
  @Post() @Roles(Role.OWNER, Role.MANAGER) create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateBookingDto) { return this.appointments.create(tenant.tenantId, dto); }
  @Patch(':id') @Roles(Role.OWNER, Role.MANAGER) update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateBookingDto) { return this.appointments.update(tenant.tenantId, id, dto); }
}

@Controller('public/:publicId/appointments')
export class PublicAppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}
  @Public() @Get('availability') availability(@Param('publicId') publicId: string, @Query('date') date: string, @Query('catalogItemId') catalogItemId?: string) { return this.appointments.availability(publicId, date, catalogItemId); }
  @Public() @Post() create(@Param('publicId') publicId: string, @Body() dto: CreateBookingDto) { return this.appointments.createByPublicId(publicId, dto); }
}

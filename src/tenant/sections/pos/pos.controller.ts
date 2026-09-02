import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantContextGuard } from '../../../core/guards/tenant.guard.js';
import { RolesGuard } from '../../../core/guards/roles.guard.js';
import { Roles } from '../../../core/decorators/roles.decorator.js';
import { CurrentTenant } from '../../../core/decorators/tenant-context.decorator.js';
import type { TenantContext } from '../../../core/interfaces/context.interface.js';
import { CloseCashDto, OpenCashDto } from './dto/cash.dto.js';
import { PosService } from './pos.service.js';

@Controller('pos') @UseGuards(TenantContextGuard, RolesGuard)
export class PosController {
  constructor(private readonly pos: PosService) {}
  @Get('cash') current(@CurrentTenant() tenant: TenantContext) { return this.pos.current(tenant.tenantId); }
  @Post('cash/open') @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER) open(@CurrentTenant() tenant: TenantContext, @Body() dto: OpenCashDto) { return this.pos.open(tenant.tenantId, dto); }
  @Post('cash/close') @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER) close(@CurrentTenant() tenant: TenantContext, @Body() dto: CloseCashDto) { return this.pos.close(tenant.tenantId, dto); }
}

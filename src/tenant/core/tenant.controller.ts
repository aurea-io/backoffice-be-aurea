import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantService } from './tenant.service.js';
import { UpdateTenantSettingsDto } from './dto/update-settings.dto.js';
import { TenantContextGuard } from '../../core/guards/tenant.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { Roles } from '../../core/decorators/roles.decorator.js';
import { CurrentTenant } from '../../core/decorators/tenant-context.decorator.js';
import type { TenantContext } from '../../core/interfaces/context.interface.js';

@Controller('tenant')
@UseGuards(TenantContextGuard, RolesGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('context')
  async getContext(@CurrentTenant() tenant: TenantContext) {
    return this.tenantService.getTenantContext(tenant.tenantId);
  }

  @Patch('settings')
  @Roles(Role.OWNER, Role.MANAGER)
  async updateSettings(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    return this.tenantService.updateSettings(tenant.tenantId, dto);
  }

  @Get('members')
  async getMembers(@CurrentTenant() tenant: TenantContext) {
    return this.tenantService.getMembers(tenant.tenantId);
  }

  @Post('members')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.OWNER, Role.MANAGER)
  async addMember(
    @CurrentTenant() tenant: TenantContext,
    @Body('email') email: string,
    @Body('role') role?: Role,
  ) {
    return this.tenantService.addMember(tenant.tenantId, email, role);
  }
}

import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
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
import { UpdateMemberDto } from './dto/update-member.dto.js';

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

  @Get('billing')
  async getBilling(@CurrentTenant() tenant: TenantContext) {
    return this.tenantService.getBilling(tenant.tenantId);
  }

  @Post('members')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.OWNER, Role.MANAGER)
  async addMember(
    @CurrentTenant() tenant: TenantContext,
    @Body('email') email: string,
    @Body('role') role?: Role,
    @Body('permissions') permissions?: string[],
  ) {
    return this.tenantService.addMember(tenant.tenantId, email, role, permissions);
  }

  @Patch('members/:userId')
  @Roles(Role.OWNER)
  async updateMember(@CurrentTenant() tenant: TenantContext, @Param('userId') userId: string, @Body() dto: UpdateMemberDto) {
    return this.tenantService.updateMember(tenant.tenantId, userId, dto);
  }

  @Delete('members/:userId')
  @Roles(Role.OWNER)
  async removeMember(@CurrentTenant() tenant: TenantContext, @Param('userId') userId: string) {
    return this.tenantService.removeMember(tenant.tenantId, userId);
  }
}

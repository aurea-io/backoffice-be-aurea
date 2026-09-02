import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { SuperadminTenantsService } from './tenants.service.js';
import {
  CreateTenantDto,
  UpdateTenantDto,
  AssignFeatureDto,
  BatchFeaturesDto,
  GrantSuperAdminDto,
} from './dto/index.js';
import { Roles } from '../../core/decorators/roles.decorator.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../core/interfaces/context.interface.js';

@Controller('superadmin')
@UseGuards(RolesGuard)
@Roles(Role.SUPERADMIN)
export class SuperadminController {
  constructor(private readonly tenantsService: SuperadminTenantsService) {}

  @Get('tenants')
  async getAllTenants() {
    return this.tenantsService.findAllTenants();
  }

  @Get('tenants/:id')
  async getTenantById(@Param('id') id: string) {
    return this.tenantsService.findTenantById(id);
  }

  @Post('tenants')
  @HttpCode(HttpStatus.CREATED)
  async createTenant(@Body() dto: CreateTenantDto, @CurrentUser() user: JwtPayload) {
    return this.tenantsService.createTenant(dto, user.sub);
  }

  @Patch('tenants/:id')
  async updateTenant(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantsService.updateTenant(id, dto, user.sub);
  }

  @Delete('tenants/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTenant(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tenantsService.deleteTenant(id, user.sub);
  }

  @Post('tenants/:id/features')
  async assignFeature(
    @Param('id') tenantId: string,
    @Body() dto: AssignFeatureDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantsService.assignFeature(tenantId, dto, user.sub);
  }

  @Put('tenants/:id/features')
  async batchAssignFeatures(
    @Param('id') tenantId: string,
    @Body() dto: BatchFeaturesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantsService.batchAssignFeatures(tenantId, dto, user.sub);
  }

  @Post('users/grant-superadmin')
  @HttpCode(HttpStatus.OK)
  async grantSuperAdmin(@Body() dto: GrantSuperAdminDto) {
    return this.tenantsService.grantSuperAdmin(dto.email);
  }
}

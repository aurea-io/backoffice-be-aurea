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
import { Roles } from '../core/decorators/roles.decorator.js';
import { RolesGuard } from '../core/guards/roles.guard.js';
import { MODULE_CATALOG } from '../core/constants/module-catalog.js';

@Controller('superadmin')
@UseGuards(RolesGuard)
@Roles(Role.SUPERADMIN)
export class SuperadminController {
  constructor(private readonly tenantsService: SuperadminTenantsService) {}

  @Get('modules')
  async getModuleCatalog() {
    return { version: MODULE_CATALOG.length, modules: MODULE_CATALOG };
  }

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
  async createTenant(@Body() dto: CreateTenantDto) {
    return this.tenantsService.createTenant(dto);
  }

  @Patch('tenants/:id')
  async updateTenant(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.updateTenant(id, dto);
  }

  @Delete('tenants/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTenant(@Param('id') id: string) {
    return this.tenantsService.deleteTenant(id);
  }

  @Post('tenants/:id/features')
  async assignFeature(
    @Param('id') tenantId: string,
    @Body() dto: AssignFeatureDto,
  ) {
    return this.tenantsService.assignFeature(tenantId, dto);
  }

  @Put('tenants/:id/features')
  async batchAssignFeatures(
    @Param('id') tenantId: string,
    @Body() dto: BatchFeaturesDto,
  ) {
    return this.tenantsService.batchAssignFeatures(tenantId, dto);
  }

  @Post('users/grant-superadmin')
  @HttpCode(HttpStatus.OK)
  async grantSuperAdmin(@Body() dto: GrantSuperAdminDto) {
    return this.tenantsService.grantSuperAdmin(dto.email);
  }
}

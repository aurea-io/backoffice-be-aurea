import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CatalogService } from './catalog.service.js';
import { CreateCatalogItemDto, UpdateCatalogItemDto } from './dto/index.js';
import { TenantContextGuard } from '../core/guards/tenant.guard.js';
import { FeatureGuard } from '../core/guards/feature.guard.js';
import { RolesGuard } from '../core/guards/roles.guard.js';
import { RequireFeature } from '../core/decorators/require-feature.decorator.js';
import { Roles } from '../core/decorators/roles.decorator.js';
import { CurrentTenant } from '../core/decorators/tenant-context.decorator.js';
import { FeatureConstants } from '../core/constants/index.js';
import type { TenantContext } from '../core/interfaces/context.interface.js';

@Controller('catalog')
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard)
@RequireFeature(FeatureConstants.CATALOG)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  async getAll(
    @CurrentTenant() tenant: TenantContext,
    @Query('category') category?: string,
    @Query('isService') isService?: string,
  ) {
    const isServiceBool =
      isService !== undefined ? isService === 'true' : undefined;
    return this.catalogService.findAll(tenant.tenantId, category, isServiceBool);
  }

  @Get(':id')
  async getOne(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.catalogService.findOne(tenant.tenantId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.OWNER, Role.MANAGER)
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateCatalogItemDto,
  ) {
    return this.catalogService.create(tenant.tenantId, dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  async update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateCatalogItemDto,
  ) {
    return this.catalogService.update(tenant.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.OWNER, Role.MANAGER)
  async remove(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.catalogService.remove(tenant.tenantId, id);
  }
}

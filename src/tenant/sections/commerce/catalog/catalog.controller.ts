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
import { CreateCatalogItemDto, UpdateCatalogItemDto, CreateCategoryDto, UpdateCategoryDto, CreateModifierGroupDto, UpdateModifierGroupDto, CreateModifierOptionDto, UpdateModifierOptionDto, ImportCatalogDto } from './dto/index.js';
import { TenantContextGuard } from '../../../../core/guards/tenant.guard.js';
import { FeatureGuard } from '../../../../core/guards/feature.guard.js';
import { RolesGuard } from '../../../../core/guards/roles.guard.js';
import { PermissionsGuard } from '../../../../core/guards/permissions.guard.js';
import { RequireFeature } from '../../../../core/decorators/require-feature.decorator.js';
import { Roles } from '../../../../core/decorators/roles.decorator.js';
import { RequirePermissions } from '../../../../core/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../../core/decorators/tenant-context.decorator.js';
import { FeatureConstants } from '../../../../core/constants/index.js';
import type { TenantContext } from '../../../../core/interfaces/context.interface.js';
import { Public } from '../../../../core/decorators/public.decorator.js';

@Controller('catalog')
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard, PermissionsGuard)
@RequireFeature(FeatureConstants.CATALOG)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  getCategories(@CurrentTenant() tenant: TenantContext) { return this.catalogService.listCategories(tenant.tenantId); }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.OWNER, Role.MANAGER)
  @RequirePermissions('catalog:write')
  createCategory(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateCategoryDto) { return this.catalogService.createCategory(tenant.tenantId, dto); }

  @Patch('categories/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequirePermissions('catalog:write')
  updateCategory(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateCategoryDto) { return this.catalogService.updateCategory(tenant.tenantId, id, dto); }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.OWNER, Role.MANAGER)
  @RequirePermissions('catalog:write')
  removeCategory(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) { return this.catalogService.removeCategory(tenant.tenantId, id); }

  @Get('modifiers')
  getModifierGroups(@CurrentTenant() tenant: TenantContext) { return this.catalogService.listModifierGroups(tenant.tenantId); }

  @Post('modifiers')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.OWNER, Role.MANAGER)
  @RequirePermissions('catalog:write')
  createModifierGroup(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateModifierGroupDto) { return this.catalogService.createModifierGroup(tenant.tenantId, dto); }

  @Patch('modifiers/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequirePermissions('catalog:write')
  updateModifierGroup(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateModifierGroupDto) { return this.catalogService.updateModifierGroup(tenant.tenantId, id, dto); }

  @Delete('modifiers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.OWNER, Role.MANAGER)
  @RequirePermissions('catalog:write')
  removeModifierGroup(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) { return this.catalogService.removeModifierGroup(tenant.tenantId, id); }

  @Post('modifiers/:groupId/options')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.OWNER, Role.MANAGER)
  @RequirePermissions('catalog:write')
  addModifierOption(@CurrentTenant() tenant: TenantContext, @Param('groupId') groupId: string, @Body() dto: CreateModifierOptionDto) { return this.catalogService.addModifierOption(tenant.tenantId, groupId, dto); }

  @Patch('modifier-options/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequirePermissions('catalog:write')
  updateModifierOption(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateModifierOptionDto) { return this.catalogService.updateModifierOption(tenant.tenantId, id, dto); }

  @Delete('modifier-options/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.OWNER, Role.MANAGER)
  @RequirePermissions('catalog:write')
  removeModifierOption(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) { return this.catalogService.removeModifierOption(tenant.tenantId, id); }

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

  @Post('import')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequirePermissions('catalog:write')
  importCsv(@CurrentTenant() tenant: TenantContext, @Body() dto: ImportCatalogDto) { return this.catalogService.importCsv(tenant.tenantId, dto); }

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
  @RequirePermissions('catalog:write')
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateCatalogItemDto,
  ) {
    return this.catalogService.create(tenant.tenantId, dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequirePermissions('catalog:write')
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
  @RequirePermissions('catalog:write')
  async remove(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.catalogService.remove(tenant.tenantId, id);
  }
}

@Controller('public/:publicId/catalog')
export class PublicCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get()
  getPublicCatalog(@Param('publicId') publicId: string) { return this.catalogService.findPublic(publicId); }
}

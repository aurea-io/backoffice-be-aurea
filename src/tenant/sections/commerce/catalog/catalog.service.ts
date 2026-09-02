import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogRepository } from '../../../../repositories/index.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { CreateCatalogItemDto, UpdateCatalogItemDto } from './dto/index.js';
import type { CreateCategoryDto, UpdateCategoryDto, CreateModifierGroupDto, UpdateModifierGroupDto, CreateModifierOptionDto, UpdateModifierOptionDto } from './dto/index.js';

@Injectable()
export class CatalogService {
  constructor(
    private readonly catalogRepo: CatalogRepository,
    private readonly prisma: PrismaService,
  ) {}

  private slugify(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private async validateStructure(tenantId: string, categoryId?: string, modifierGroupIds?: string[]) {
    if (categoryId && !(await this.prisma.catalogCategory.findFirst({ where: { id: categoryId, tenantId, isActive: true } }))) throw new BadRequestException('Category does not belong to this tenant.');
    if (modifierGroupIds?.length) {
      const groups = await this.prisma.catalogModifierGroup.findMany({ where: { tenantId, id: { in: modifierGroupIds }, isActive: true }, select: { id: true } });
      if (groups.length !== new Set(modifierGroupIds).size) throw new BadRequestException('One or more modifier groups do not belong to this tenant.');
    }
  }

  async listCategories(tenantId: string) {
    return this.prisma.catalogCategory.findMany({ where: { tenantId }, orderBy: [{ parentId: 'asc' }, { name: 'asc' }] });
  }

  async createCategory(tenantId: string, dto: CreateCategoryDto) {
    const name = dto.name.trim();
    if (dto.parentId && !(await this.prisma.catalogCategory.findFirst({ where: { id: dto.parentId, tenantId } }))) throw new BadRequestException('Parent category does not belong to this tenant.');
    return this.prisma.catalogCategory.create({ data: { tenantId, name, slug: this.slugify(name), parentId: dto.parentId, isActive: dto.isActive ?? true } });
  }

  async updateCategory(tenantId: string, id: string, dto: UpdateCategoryDto) {
    const current = await this.prisma.catalogCategory.findFirst({ where: { id, tenantId } });
    if (!current) throw new NotFoundException('Category not found.');
    if (dto.parentId === id) throw new BadRequestException('A category cannot be its own parent.');
    if (dto.parentId && !(await this.prisma.catalogCategory.findFirst({ where: { id: dto.parentId, tenantId } }))) throw new BadRequestException('Parent category does not belong to this tenant.');
    const name = dto.name?.trim();
    return this.prisma.catalogCategory.update({ where: { id }, data: { name, slug: name ? this.slugify(name) : undefined, parentId: dto.parentId, isActive: dto.isActive } });
  }

  async removeCategory(tenantId: string, id: string) {
    const category = await this.prisma.catalogCategory.findFirst({ where: { id, tenantId } });
    if (!category) throw new NotFoundException('Category not found.');
    const children = await this.prisma.catalogCategory.count({ where: { tenantId, parentId: id, isActive: true } });
    if (children) throw new BadRequestException('Move or deactivate child categories before deleting this category.');
    return this.prisma.catalogCategory.delete({ where: { id } });
  }

  async listModifierGroups(tenantId: string) {
    return this.prisma.catalogModifierGroup.findMany({ where: { tenantId }, include: { options: { orderBy: { name: 'asc' } } }, orderBy: { name: 'asc' } });
  }

  async createModifierGroup(tenantId: string, dto: CreateModifierGroupDto) {
    const min = dto.minSelections ?? 0;
    const max = dto.maxSelections ?? 1;
    if (min > max) throw new BadRequestException('Minimum selections cannot exceed maximum selections.');
    return this.prisma.catalogModifierGroup.create({ data: { tenantId, name: dto.name.trim(), minSelections: min, maxSelections: max, isActive: dto.isActive ?? true, options: dto.options?.length ? { create: dto.options.map((option) => ({ name: option.name.trim(), priceDeltaCents: option.priceDeltaCents ?? 0, isActive: option.isActive ?? true })) } : undefined }, include: { options: true } });
  }

  async updateModifierGroup(tenantId: string, id: string, dto: UpdateModifierGroupDto) {
    const group = await this.prisma.catalogModifierGroup.findFirst({ where: { id, tenantId } });
    if (!group) throw new NotFoundException('Modifier group not found.');
    const min = dto.minSelections ?? group.minSelections;
    const max = dto.maxSelections ?? group.maxSelections;
    if (min > max) throw new BadRequestException('Minimum selections cannot exceed maximum selections.');
    return this.prisma.catalogModifierGroup.update({ where: { id }, data: { name: dto.name?.trim(), minSelections: dto.minSelections, maxSelections: dto.maxSelections, isActive: dto.isActive }, include: { options: true } });
  }

  async removeModifierGroup(tenantId: string, id: string) {
    const group = await this.prisma.catalogModifierGroup.findFirst({ where: { id, tenantId } });
    if (!group) throw new NotFoundException('Modifier group not found.');
    return this.prisma.catalogModifierGroup.delete({ where: { id } });
  }

  async addModifierOption(tenantId: string, groupId: string, dto: CreateModifierOptionDto) {
    const group = await this.prisma.catalogModifierGroup.findFirst({ where: { id: groupId, tenantId } });
    if (!group) throw new NotFoundException('Modifier group not found.');
    return this.prisma.catalogModifierOption.create({ data: { groupId, name: dto.name.trim(), priceDeltaCents: dto.priceDeltaCents ?? 0, isActive: dto.isActive ?? true } });
  }

  async updateModifierOption(tenantId: string, id: string, dto: UpdateModifierOptionDto) {
    const option = await this.prisma.catalogModifierOption.findFirst({ where: { id, group: { tenantId } } });
    if (!option) throw new NotFoundException('Modifier option not found.');
    return this.prisma.catalogModifierOption.update({ where: { id }, data: { name: dto.name?.trim(), priceDeltaCents: dto.priceDeltaCents, isActive: dto.isActive } });
  }

  async removeModifierOption(tenantId: string, id: string) {
    const option = await this.prisma.catalogModifierOption.findFirst({ where: { id, group: { tenantId } } });
    if (!option) throw new NotFoundException('Modifier option not found.');
    return this.prisma.catalogModifierOption.delete({ where: { id } });
  }

  async findAll(tenantId: string, category?: string, isService?: boolean) {
    return this.catalogRepo.findAllByTenant(tenantId, {
      category,
      isService,
    });
  }

  async findPublic(publicId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: publicId.trim().toLowerCase() }, select: { id: true, slug: true, name: true, vertical: true, isActive: true } });
    if (!tenant || !tenant.isActive) throw new NotFoundException('Public tenant not found.');
    const [items, categories, modifierGroups] = await Promise.all([
      this.prisma.catalogItem.findMany({ where: { tenantId: tenant.id, isActive: true }, orderBy: { createdAt: 'asc' } }),
      this.prisma.catalogCategory.findMany({ where: { tenantId: tenant.id, isActive: true }, orderBy: { name: 'asc' } }),
      this.prisma.catalogModifierGroup.findMany({ where: { tenantId: tenant.id, isActive: true }, include: { options: { where: { isActive: true }, orderBy: { name: 'asc' } } }, orderBy: { name: 'asc' } }),
    ]);
    return { tenant: { publicId: tenant.slug, name: tenant.name, vertical: tenant.vertical }, items, categories, modifierGroups };
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.catalogRepo.findByIdAndTenant(tenantId, id);

    if (!item) {
      throw new NotFoundException(`Catalog item with ID '${id}' not found.`);
    }

    return item;
  }

  async create(tenantId: string, dto: CreateCatalogItemDto) {
    await this.validateStructure(tenantId, dto.categoryId, dto.modifierGroupIds);
    return this.catalogRepo.create({
      tenantId,
      title: dto.title,
      description: dto.description,
      priceCents: dto.priceCents,
      category: dto.category,
      categoryId: dto.categoryId,
      modifierGroupIds: dto.modifierGroupIds,
      isService: dto.isService,
      durationMin: dto.durationMin,
      imageUrl: dto.imageUrl,
      isActive: dto.isActive,
      metadata: dto.metadata,
    });
  }

  async update(tenantId: string, id: string, dto: UpdateCatalogItemDto) {
    await this.findOne(tenantId, id);
    await this.validateStructure(tenantId, dto.categoryId, dto.modifierGroupIds);

    return this.catalogRepo.update(id, {
      title: dto.title ? dto.title.trim() : undefined,
      description: dto.description !== undefined ? dto.description?.trim() : undefined,
      priceCents: dto.priceCents,
      category: dto.category !== undefined ? dto.category?.trim() : undefined,
      categoryId: dto.categoryId,
      modifierGroupIds: dto.modifierGroupIds,
      isService: typeof dto.isService === 'boolean' ? dto.isService : undefined,
      durationMin: dto.durationMin,
      imageUrl: dto.imageUrl,
      isActive: typeof dto.isActive === 'boolean' ? dto.isActive : undefined,
      metadata: dto.metadata,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.catalogRepo.delete(id);
  }
}

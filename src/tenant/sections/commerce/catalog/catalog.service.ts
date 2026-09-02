import { Injectable, NotFoundException } from '@nestjs/common';
import { CatalogRepository } from '../../../../repositories/index.js';
import type { CreateCatalogItemDto, UpdateCatalogItemDto } from './dto/index.js';

@Injectable()
export class CatalogService {
  constructor(private readonly catalogRepo: CatalogRepository) {}

  async findAll(tenantId: string, category?: string, isService?: boolean) {
    return this.catalogRepo.findAllByTenant(tenantId, {
      category,
      isService,
    });
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.catalogRepo.findByIdAndTenant(tenantId, id);

    if (!item) {
      throw new NotFoundException(`Catalog item with ID '${id}' not found.`);
    }

    return item;
  }

  async create(tenantId: string, dto: CreateCatalogItemDto) {
    return this.catalogRepo.create({
      tenantId,
      title: dto.title,
      description: dto.description,
      priceCents: dto.priceCents,
      category: dto.category,
      isService: dto.isService,
      durationMin: dto.durationMin,
      imageUrl: dto.imageUrl,
      isActive: dto.isActive,
      metadata: dto.metadata,
    });
  }

  async update(tenantId: string, id: string, dto: UpdateCatalogItemDto) {
    await this.findOne(tenantId, id);

    return this.catalogRepo.update(id, {
      title: dto.title ? dto.title.trim() : undefined,
      description: dto.description !== undefined ? dto.description?.trim() : undefined,
      priceCents: dto.priceCents,
      category: dto.category !== undefined ? dto.category?.trim() : undefined,
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

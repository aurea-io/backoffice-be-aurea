import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByTenant(
    tenantId: string,
    filters?: { category?: string; isService?: boolean },
  ) {
    return this.prisma.catalogItem.findMany({
      where: {
        tenantId,
        ...(filters?.category ? { category: filters.category } : {}),
        ...(typeof filters?.isService === 'boolean'
          ? { isService: filters.isService }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdAndTenant(tenantId: string, id: string) {
    return this.prisma.catalogItem.findFirst({
      where: {
        id,
        tenantId,
      },
    });
  }

  async create(data: {
    tenantId: string;
    title: string;
    description?: string;
    priceCents: number;
    sku?: string;
    stockInitial?: number;
    professionalId?: string;
    category?: string;
    categoryId?: string;
    modifierGroupIds?: string[];
    isService?: boolean;
    durationMin?: number;
    imageUrl?: string;
    isActive?: boolean;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.catalogItem.create({
      data: {
        tenantId: data.tenantId,
        title: data.title.trim(),
        description: data.description?.trim(),
        priceCents: data.priceCents,
        sku: data.sku?.trim().toUpperCase(),
        stockInitial: data.stockInitial,
        professionalId: data.professionalId,
        category: data.category?.trim(),
        categoryId: data.categoryId,
        modifierGroupIds: data.modifierGroupIds ?? [],
        isService: data.isService ?? false,
        durationMin: data.durationMin,
        imageUrl: data.imageUrl,
        isActive: data.isActive ?? true,
        metadata: data.metadata ?? {},
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      priceCents: number;
      sku: string;
      stockInitial: number;
      professionalId: string;
      category: string;
      categoryId: string;
      modifierGroupIds: string[];
      isService: boolean;
      durationMin: number;
      imageUrl: string;
      isActive: boolean;
      metadata: Record<string, any>;
    }>,
  ) {
    return this.prisma.catalogItem.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.catalogItem.delete({
      where: { id },
    });
  }
}

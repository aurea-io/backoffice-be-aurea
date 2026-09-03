import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { AdjustInventoryDto, CreateInventoryDto } from './dto/inventory.dto.js';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}
  list(tenantId: string) { return this.prisma.inventoryItem.findMany({ where: { tenantId, isActive: true }, include: { movements: { orderBy: { createdAt: 'desc' }, take: 10 } }, orderBy: { name: 'asc' } }); }
  create(tenantId: string, dto: CreateInventoryDto) { return this.prisma.inventoryItem.create({ data: { tenantId, name: dto.name.trim(), sku: dto.sku?.trim(), unit: dto.unit?.trim() || 'unidad', quantity: dto.quantity, minimum: dto.minimum ?? 0, costCents: dto.costCents ?? 0 } }); }
  async adjust(tenantId: string, id: string, dto: AdjustInventoryDto) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id, tenantId, isActive: true } });
    if (!item) throw new NotFoundException('Artículo de inventario no encontrado.');
    const quantity = Math.max(0, item.quantity + dto.quantity);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({ where: { id }, data: { quantity } });
      await tx.stockMovement.create({ data: { tenantId, inventoryItemId: id, quantity: dto.quantity, reason: dto.reason?.trim() } });
      return updated;
    });
  }
}

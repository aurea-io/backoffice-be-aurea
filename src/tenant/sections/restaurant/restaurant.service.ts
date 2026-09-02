import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { CreateOrderDto, CreateTableDto, UpdateOrderDto, UpdateTableDto } from './dto/restaurant.dto.js';

@Injectable()
export class RestaurantService {
  constructor(private readonly prisma: PrismaService) {}
  listTables(tenantId: string) { return this.prisma.restaurantTable.findMany({ where: { tenantId }, include: { orders: { where: { status: { not: 'paid' as any } }, include: { lines: true } } }, orderBy: { number: 'asc' } }); }
  createTable(tenantId: string, dto: CreateTableDto) { return this.prisma.restaurantTable.create({ data: { tenantId, number: dto.number, seats: dto.seats ?? 2 } }); }
  async updateTable(tenantId: string, id: string, dto: UpdateTableDto) { const table = await this.prisma.restaurantTable.findFirst({ where: { id, tenantId } }); if (!table) throw new NotFoundException('Mesa no encontrada.'); return this.prisma.restaurantTable.update({ where: { id }, data: { status: dto.status } }); }
  listOrders(tenantId: string) { return this.prisma.order.findMany({ where: { tenantId }, include: { table: true, lines: { include: { catalogItem: true } } }, orderBy: { createdAt: 'desc' } }); }
  async createOrder(tenantId: string, dto: CreateOrderDto) {
    if (!dto.lines.length) throw new BadRequestException('El pedido debe tener al menos un ítem.');
    if (dto.tableId && !await this.prisma.restaurantTable.findFirst({ where: { id: dto.tableId, tenantId } })) throw new BadRequestException('La mesa no pertenece al comercio.');
    const catalog = await this.prisma.catalogItem.findMany({ where: { tenantId, id: { in: dto.lines.map((line) => line.catalogItemId) }, isActive: true } });
    if (catalog.length !== new Set(dto.lines.map((line) => line.catalogItemId)).size) throw new BadRequestException('Uno o más ítems no están disponibles.');
    const prices = new Map(catalog.map((item) => [item.id, item.priceCents]));
    return this.prisma.order.create({ data: { tenantId, tableId: dto.tableId, customerName: dto.customerName?.trim(), notes: dto.notes?.trim(), lines: { create: dto.lines.map((line) => ({ catalogItemId: line.catalogItemId, quantity: line.quantity, guestName: line.guestName?.trim(), unitPriceCents: prices.get(line.catalogItemId)! })) } }, include: { table: true, lines: { include: { catalogItem: true } } } });
  }
  async updateOrder(tenantId: string, id: string, dto: UpdateOrderDto) { const order = await this.prisma.order.findFirst({ where: { id, tenantId } }); if (!order) throw new NotFoundException('Pedido no encontrado.'); return this.prisma.order.update({ where: { id }, data: { status: dto.status }, include: { lines: true } }); }
}

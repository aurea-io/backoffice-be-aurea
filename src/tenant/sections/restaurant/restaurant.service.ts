import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { CreateOrderDto, CreateTableDto, UpdateOrderDto, UpdateTableDto, CreateTableBookingDto, UpdateTableBookingDto } from './dto/restaurant.dto.js';
import { CouponsService } from '../../../coupons/coupons.service.js';

const tableDay = (value: string) => new Date(`${value}T00:00:00.000Z`);
const tableMinutes = (value: string) => { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes; };

@Injectable()
export class RestaurantService {
  constructor(private readonly prisma: PrismaService, private readonly coupons: CouponsService) {}
  listTables(tenantId: string) { return this.prisma.restaurantTable.findMany({ where: { tenantId }, include: { orders: { where: { status: { not: 'paid' as any } }, include: { lines: true } } }, orderBy: { number: 'asc' } }); }
  createTable(tenantId: string, dto: CreateTableDto) { return this.prisma.restaurantTable.create({ data: { tenantId, number: dto.number, seats: dto.seats ?? 2 } }); }
  async updateTable(tenantId: string, id: string, dto: UpdateTableDto) { const table = await this.prisma.restaurantTable.findFirst({ where: { id, tenantId } }); if (!table) throw new NotFoundException('Mesa no encontrada.'); return this.prisma.restaurantTable.update({ where: { id }, data: { status: dto.status } }); }
  async tableQr(tenantId: string, id: string) {
    const table = await this.prisma.restaurantTable.findFirst({ where: { id, tenantId }, include: { tenant: { select: { slug: true, name: true } } } });
    if (!table) throw new NotFoundException('Mesa no encontrada.');
    const appUrl = (process.env.PUBLIC_APP_URL || 'http://localhost:4173').replace(/\/$/, '');
    const menuUrl = `${appUrl}/apps/web/#restaurant?tenant=${encodeURIComponent(table.tenant.slug)}&table=${table.number}`;
    return { tableId: table.id, tableNumber: table.number, tenantName: table.tenant.name, menuUrl, qrImageUrl: `https://quickchart.io/qr?size=320&text=${encodeURIComponent(menuUrl)}` };
  }
  listTableBookings(tenantId: string, from?: string, to?: string) { return this.prisma.tableBooking.findMany({ where: { tenantId, ...(from || to ? { date: { gte: from ? tableDay(from) : undefined, lte: to ? tableDay(to) : undefined } } : {}) }, include: { table: true }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] }); }
  async createTableBooking(tenantId: string, dto: CreateTableBookingDto) {
    const requestedStart = tableMinutes(dto.startTime); const duration = dto.durationMin ?? 120; const requestedEnd = requestedStart + duration;
    const candidates = dto.tableId ? await this.prisma.restaurantTable.findMany({ where: { id: dto.tableId, tenantId, seats: { gte: dto.partySize } } }) : await this.prisma.restaurantTable.findMany({ where: { tenantId, seats: { gte: dto.partySize }, status: { not: 'billing' as any } }, orderBy: { number: 'asc' } });
    if (!candidates.length) throw new BadRequestException('No hay una mesa adecuada para esa cantidad de personas.');
    const existing = await this.prisma.tableBooking.findMany({ where: { tenantId, date: tableDay(dto.date), status: { not: 'canceled' as any }, tableId: { in: candidates.map((table) => table.id) } }, select: { tableId: true, startTime: true, durationMin: true } });
    const table = candidates.find((candidate) => !existing.some((booking) => booking.tableId === candidate.id && requestedStart < tableMinutes(booking.startTime) + booking.durationMin && requestedEnd > tableMinutes(booking.startTime)));
    if (!table) throw new ConflictException('No hay disponibilidad para ese horario.');
    return this.prisma.tableBooking.create({ data: { tenantId, tableId: table.id, customerName: dto.customerName.trim(), customerEmail: dto.customerEmail?.trim().toLowerCase(), customerPhone: dto.customerPhone?.trim(), date: tableDay(dto.date), startTime: dto.startTime, durationMin: duration, partySize: dto.partySize, notes: dto.notes?.trim() }, include: { table: true } });
  }
  async createTableBookingByPublicId(publicId: string, dto: CreateTableBookingDto) { const tenant = await this.prisma.tenant.findUnique({ where: { slug: publicId.trim().toLowerCase() }, select: { id: true, isActive: true } }); if (!tenant?.isActive) throw new NotFoundException('Comercio no encontrado.'); return this.createTableBooking(tenant.id, dto); }
  async updateTableBooking(tenantId: string, id: string, dto: UpdateTableBookingDto) { const booking = await this.prisma.tableBooking.findFirst({ where: { id, tenantId } }); if (!booking) throw new NotFoundException('Reserva de mesa no encontrada.'); return this.prisma.tableBooking.update({ where: { id }, data: dto, include: { table: true } }); }
  async tableBookingAvailability(publicId: string, date: string, partySize: number) { const tenant = await this.prisma.tenant.findUnique({ where: { slug: publicId.trim().toLowerCase() }, select: { id: true, isActive: true } }); if (!tenant?.isActive) throw new NotFoundException('Comercio no encontrado.'); const tables = await this.prisma.restaurantTable.findMany({ where: { tenantId: tenant.id, seats: { gte: partySize }, status: { not: 'billing' as any } }, select: { id: true, number: true, seats: true } }); const bookings = await this.prisma.tableBooking.findMany({ where: { tenantId: tenant.id, date: tableDay(date), status: { not: 'canceled' as any } }, select: { tableId: true, startTime: true, durationMin: true } }); const slots = Array.from({ length: 19 }, (_, index) => 12 * 60 + index * 30).filter((start) => start + 120 <= 22 * 60 && tables.some((table) => !bookings.some((booking) => booking.tableId === table.id && start < tableMinutes(booking.startTime) + booking.durationMin && start + 120 > tableMinutes(booking.startTime)))).map((start) => `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`); return { date, partySize, tables, slots }; }
  listOrders(tenantId: string) { return this.prisma.order.findMany({ where: { tenantId }, include: { table: true, lines: { include: { catalogItem: true } } }, orderBy: { createdAt: 'desc' } }); }
  listKitchenOrders(tenantId: string) { return this.prisma.order.findMany({ where: { tenantId, status: { in: ['open' as any, 'preparing' as any, 'ready' as any] } }, include: { table: true, lines: { include: { catalogItem: true } } }, orderBy: { createdAt: 'asc' } }); }
  async createOrder(tenantId: string, dto: CreateOrderDto) {
    if (!dto.lines.length) throw new BadRequestException('El pedido debe tener al menos un ítem.');
    if (dto.tableId && !await this.prisma.restaurantTable.findFirst({ where: { id: dto.tableId, tenantId } })) throw new BadRequestException('La mesa no pertenece al comercio.');
    const catalog = await this.prisma.catalogItem.findMany({ where: { tenantId, id: { in: dto.lines.map((line) => line.catalogItemId) }, isActive: true } });
    if (catalog.length !== new Set(dto.lines.map((line) => line.catalogItemId)).size) throw new BadRequestException('Uno o más ítems no están disponibles.');
    const prices = new Map(catalog.map((item) => [item.id, item.priceCents]));
    const subtotalCents = dto.lines.reduce((sum, line) => sum + line.quantity * prices.get(line.catalogItemId)!, 0);
    const discount = dto.couponCode ? await this.coupons.redeem(tenantId, dto.couponCode, subtotalCents) : undefined;
    return this.prisma.order.create({ data: { tenantId, tableId: dto.tableId, customerName: dto.customerName?.trim(), notes: dto.notes?.trim(), channel: dto.channel, deliveryAddress: dto.deliveryAddress?.trim(), deliveryStatus: dto.channel === 'delivery' ? 'pending' : undefined, couponCode: discount?.code, discountCents: discount?.discountCents ?? 0, lines: { create: dto.lines.map((line) => ({ catalogItemId: line.catalogItemId, quantity: line.quantity, guestName: line.guestName?.trim(), unitPriceCents: prices.get(line.catalogItemId)! })) } }, include: { table: true, lines: { include: { catalogItem: true } } } });
  }
  async createPublicOrder(publicId: string, dto: CreateOrderDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: publicId.trim().toLowerCase() }, select: { id: true, isActive: true } });
    if (!tenant || !tenant.isActive) throw new NotFoundException('Comercio público no disponible.');
    const feature = await this.prisma.tenantFeature.findUnique({ where: { tenantId_featureKey: { tenantId: tenant.id, featureKey: 'orders' } } });
    if (feature && !feature.isEnabled) throw new BadRequestException('Los pedidos públicos no están habilitados.');
    let tableId = dto.tableId;
    if (tableId) {
      const table = /^[a-f0-9]{24}$/i.test(tableId)
        ? await this.prisma.restaurantTable.findFirst({ where: { tenantId: tenant.id, id: tableId }, select: { id: true } })
        : await this.prisma.restaurantTable.findFirst({ where: { tenantId: tenant.id, number: Number(tableId) || -1 }, select: { id: true } });
      if (!table) throw new BadRequestException('La mesa no pertenece al comercio.');
      tableId = table.id;
    }
    return this.createOrder(tenant.id, { ...dto, tableId });
  }
  async updateOrder(tenantId: string, id: string, dto: UpdateOrderDto) { const order = await this.prisma.order.findFirst({ where: { id, tenantId } }); if (!order) throw new NotFoundException('Pedido no encontrado.'); return this.prisma.order.update({ where: { id }, data: dto, include: { lines: true } }); }
  async getOrderTicket(tenantId: string, id: string) { const order = await this.prisma.order.findFirst({ where: { id, tenantId }, include: { lines: { include: { catalogItem: { select: { title: true } } } } } }); if (!order) throw new NotFoundException('Pedido no encontrado.'); const totalCents = order.lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0) - order.discountCents; const parts = new Map<string, { totalCents: number; lines: Array<{ title: string; quantity: number; amountCents: number }> }>(); order.lines.forEach((line) => { const person = line.guestName?.trim() || 'Mesa'; const current = parts.get(person) || { totalCents: 0, lines: [] }; const amountCents = line.quantity * line.unitPriceCents; current.totalCents += amountCents; current.lines.push({ title: line.catalogItem.title, quantity: line.quantity, amountCents }); parts.set(person, current); }); return { orderId: order.id, totalCents, discountCents: order.discountCents, parts: [...parts.entries()].map(([person, value]) => ({ person, ...value })) }; }
  async issueFiscalReceipt(tenantId: string, id: string) { const order = await this.prisma.order.findFirst({ where: { id, tenantId }, include: { lines: { include: { catalogItem: { select: { title: true } } } }, fiscalReceipt: true } }); if (!order) throw new NotFoundException('Pedido no encontrado.'); if (order.fiscalReceipt) return order.fiscalReceipt; const totalCents = order.lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0) - order.discountCents; const provider = process.env.FISCAL_PROVIDER || 'mock'; return this.prisma.fiscalReceipt.create({ data: { tenantId, orderId: id, provider, status: 'issued', receiptType: provider === 'mock' ? 'internal' : 'electronic_pending', number: `AUREA-${new Date().getUTCFullYear()}-${Date.now()}`, totalCents, payload: { customerName: order.customerName, lines: order.lines.map((line) => ({ title: line.catalogItem.title, quantity: line.quantity, unitPriceCents: line.unitPriceCents })) } } }); }
}

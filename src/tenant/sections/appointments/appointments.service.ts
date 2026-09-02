import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { CreateBookingDto } from './dto/create-booking.dto.js';
import type { UpdateBookingDto } from './dto/update-booking.dto.js';
import { NotificationsService } from '../../../notifications/notifications.service.js';

const dayStart = (value: string) => new Date(`${value}T00:00:00.000Z`);
const toMinutes = (value: string) => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async list(tenantId: string, from?: string, to?: string) {
    return this.prisma.booking.findMany({
      where: { tenantId, ...(from || to ? { date: { gte: from ? dayStart(from) : undefined, lte: to ? dayStart(to) : undefined } } : {}) },
      include: { catalogItem: true }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async availability(publicId: string, date: string, catalogItemId?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: publicId.trim().toLowerCase() }, select: { id: true, isActive: true } });
    if (!tenant?.isActive) throw new NotFoundException('Comercio no encontrado.');
    const bookings = await this.prisma.booking.findMany({ where: { tenantId: tenant.id, date: dayStart(date), status: { not: BookingStatus.canceled }, ...(catalogItemId ? { catalogItemId } : {}) }, select: { startTime: true, durationMin: true } });
    return { date, booked: bookings, available: bookings.length === 0 };
  }

  async create(tenantId: string, dto: CreateBookingDto) {
    const item = await this.prisma.catalogItem.findFirst({ where: { id: dto.catalogItemId, tenantId, isActive: true, isService: true } });
    if (!item) throw new BadRequestException('El servicio no existe o no está disponible.');
    const durationMin = dto.durationMin ?? item.durationMin ?? 60;
    const requestedStart = toMinutes(dto.startTime); const requestedEnd = requestedStart + durationMin;
    const existing = await this.prisma.booking.findMany({ where: { tenantId, date: dayStart(dto.date), status: { not: BookingStatus.canceled } }, select: { startTime: true, durationMin: true } });
    if (existing.some((booking) => { const start = toMinutes(booking.startTime); return requestedStart < start + booking.durationMin && requestedEnd > start; })) throw new ConflictException('El horario seleccionado ya no está disponible.');
    const booking = await this.prisma.booking.create({ data: { tenantId, catalogItemId: item.id, customerName: dto.customerName.trim(), customerEmail: dto.customerEmail?.trim().toLowerCase(), customerPhone: dto.customerPhone?.trim(), date: dayStart(dto.date), startTime: dto.startTime, durationMin, notes: dto.notes?.trim() }, include: { catalogItem: true } });
    if (booking.customerEmail) void this.notifications.enqueue({ tenantId, channel: 'email', recipient: booking.customerEmail, subject: 'Solicitud de turno recibida', body: `Recibimos tu solicitud para ${item.title} el ${dto.date} a las ${dto.startTime}.`, referenceType: 'booking', referenceId: booking.id });
    if (booking.customerPhone) void this.notifications.enqueue({ tenantId, channel: 'whatsapp', recipient: booking.customerPhone, body: `Aurea: recibimos tu solicitud para ${item.title} el ${dto.date} a las ${dto.startTime}.`, referenceType: 'booking', referenceId: booking.id });
    return booking;
  }

  async createByPublicId(publicId: string, dto: CreateBookingDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: publicId.trim().toLowerCase() }, select: { id: true, isActive: true } });
    if (!tenant?.isActive) throw new NotFoundException('Comercio no encontrado.');
    return this.create(tenant.id, dto);
  }

  async update(tenantId: string, id: string, dto: UpdateBookingDto) {
    const booking = await this.prisma.booking.findFirst({ where: { id, tenantId } });
    if (!booking) throw new NotFoundException('Reserva no encontrada.');
    return this.prisma.booking.update({ where: { id }, data: dto });
  }
}

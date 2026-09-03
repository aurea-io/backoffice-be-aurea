import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type {
  CreateTableDto,
  UpdateTableDto,
  CreateTableBookingDto,
  UpdateTableBookingDto,
} from './dto/tables.dto.js';

const tableDay = (value: string) => new Date(`${value}T00:00:00.000Z`);

const tableMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  listTables(tenantId: string) {
    return this.prisma.restaurantTable.findMany({
      where: { tenantId },
      include: {
        orders: {
          where: { status: { not: 'paid' as any } },
          include: { lines: true },
        },
      },
      orderBy: { number: 'asc' },
    });
  }

  createTable(tenantId: string, dto: CreateTableDto) {
    return this.prisma.restaurantTable.create({
      data: {
        tenantId,
        number: dto.number,
        seats: dto.seats ?? 2,
      },
    });
  }

  async updateTable(tenantId: string, id: string, dto: UpdateTableDto) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id, tenantId },
    });
    if (!table) {
      throw new NotFoundException('Mesa no encontrada.');
    }
    return this.prisma.restaurantTable.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async tableQr(tenantId: string, id: string) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id, tenantId },
      include: {
        tenant: {
          select: { slug: true, name: true },
        },
      },
    });
    if (!table) {
      throw new NotFoundException('Mesa no encontrada.');
    }

    const appUrl = (process.env.PUBLIC_APP_URL || 'http://localhost:4173').replace(/\/$/, '');
    const menuUrl = `${appUrl}/apps/web/#restaurant?tenant=${encodeURIComponent(table.tenant.slug)}&table=${table.number}`;

    return {
      tableId: table.id,
      tableNumber: table.number,
      tenantName: table.tenant.name,
      menuUrl,
      qrImageUrl: `https://quickchart.io/qr?size=320&text=${encodeURIComponent(menuUrl)}`,
    };
  }

  listTableBookings(tenantId: string, from?: string, to?: string) {
    return this.prisma.tableBooking.findMany({
      where: {
        tenantId,
        ...(from || to
          ? {
              date: {
                gte: from ? tableDay(from) : undefined,
                lte: to ? tableDay(to) : undefined,
              },
            }
          : {}),
      },
      include: { table: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async createTableBooking(tenantId: string, dto: CreateTableBookingDto) {
    const requestedStart = tableMinutes(dto.startTime);
    const duration = dto.durationMin ?? 120;
    const requestedEnd = requestedStart + duration;

    const candidates = dto.tableId
      ? await this.prisma.restaurantTable.findMany({
          where: { id: dto.tableId, tenantId, seats: { gte: dto.partySize } },
        })
      : await this.prisma.restaurantTable.findMany({
          where: {
            tenantId,
            seats: { gte: dto.partySize },
            status: { not: 'billing' as any },
          },
          orderBy: { number: 'asc' },
        });

    if (!candidates.length) {
      throw new BadRequestException('No hay una mesa adecuada para esa cantidad de personas.');
    }

    const existing = await this.prisma.tableBooking.findMany({
      where: {
        tenantId,
        date: tableDay(dto.date),
        status: { not: 'canceled' as any },
        tableId: { in: candidates.map((table) => table.id) },
      },
      select: { tableId: true, startTime: true, durationMin: true },
    });

    const table = candidates.find(
      (candidate) =>
        !existing.some(
          (booking) =>
            booking.tableId === candidate.id &&
            requestedStart < tableMinutes(booking.startTime) + booking.durationMin &&
            requestedEnd > tableMinutes(booking.startTime),
        ),
    );

    if (!table) {
      throw new ConflictException('No hay disponibilidad para ese horario.');
    }

    return this.prisma.tableBooking.create({
      data: {
        tenantId,
        tableId: table.id,
        customerName: dto.customerName.trim(),
        customerEmail: dto.customerEmail?.trim().toLowerCase(),
        customerPhone: dto.customerPhone?.trim(),
        date: tableDay(dto.date),
        startTime: dto.startTime,
        durationMin: duration,
        partySize: dto.partySize,
        notes: dto.notes?.trim(),
      },
      include: { table: true },
    });
  }

  async createTableBookingByPublicId(publicId: string, dto: CreateTableBookingDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: publicId.trim().toLowerCase() },
      select: { id: true, isActive: true },
    });
    if (!tenant?.isActive) {
      throw new NotFoundException('Comercio no encontrado.');
    }
    return this.createTableBooking(tenant.id, dto);
  }

  async updateTableBooking(tenantId: string, id: string, dto: UpdateTableBookingDto) {
    const booking = await this.prisma.tableBooking.findFirst({
      where: { id, tenantId },
    });
    if (!booking) {
      throw new NotFoundException('Reserva de mesa no encontrada.');
    }
    return this.prisma.tableBooking.update({
      where: { id },
      data: dto,
      include: { table: true },
    });
  }

  async tableBookingAvailability(publicId: string, date: string, partySize: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: publicId.trim().toLowerCase() },
      select: { id: true, isActive: true },
    });
    if (!tenant?.isActive) {
      throw new NotFoundException('Comercio no encontrado.');
    }

    const tables = await this.prisma.restaurantTable.findMany({
      where: {
        tenantId: tenant.id,
        seats: { gte: partySize },
        status: { not: 'billing' as any },
      },
      select: { id: true, number: true, seats: true },
    });

    const bookings = await this.prisma.tableBooking.findMany({
      where: {
        tenantId: tenant.id,
        date: tableDay(date),
        status: { not: 'canceled' as any },
      },
      select: { tableId: true, startTime: true, durationMin: true },
    });

    const slots = Array.from({ length: 19 }, (_, index) => 12 * 60 + index * 30)
      .filter(
        (start) =>
          start + 120 <= 22 * 60 &&
          tables.some(
            (table) =>
              !bookings.some(
                (booking) =>
                  booking.tableId === table.id &&
                  start < tableMinutes(booking.startTime) + booking.durationMin &&
                  start + 120 > tableMinutes(booking.startTime),
              ),
          ),
      )
      .map(
        (start) =>
          `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
      );

    return { date, partySize, tables, slots };
  }
}

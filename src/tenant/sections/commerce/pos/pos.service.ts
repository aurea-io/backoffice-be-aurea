import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { CloseCashDto, OpenCashDto } from './dto/cash.dto.js';

@Injectable()
export class PosService {
  constructor(private readonly prisma: PrismaService) {}
  current(tenantId: string) { return this.prisma.cashSession.findFirst({ where: { tenantId }, orderBy: { openedAt: 'desc' } }); }
  async open(tenantId: string, dto: OpenCashDto) {
    const active = await this.prisma.cashSession.findFirst({ where: { tenantId, status: 'open' } });
    if (active) throw new ConflictException('Ya existe una caja abierta.');
    return this.prisma.cashSession.create({ data: { tenantId, openingCents: dto.openingCents } });
  }
  async close(tenantId: string, dto: CloseCashDto) {
    const active = await this.prisma.cashSession.findFirst({ where: { tenantId, status: 'open' } });
    if (!active) throw new NotFoundException('No hay una caja abierta.');
    return this.prisma.cashSession.update({ where: { id: active.id }, data: { status: 'closed', closingCents: dto.closingCents, closedAt: new Date(), notes: dto.notes?.trim() } });
  }
}

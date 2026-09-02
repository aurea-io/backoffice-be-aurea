import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, search?: string) {
    return this.prisma.customer.findMany({ where: { tenantId, ...(search?.trim() ? { OR: [{ name: { contains: search.trim(), mode: 'insensitive' } }, { email: { contains: search.trim(), mode: 'insensitive' } }, { phone: { contains: search.trim(), mode: 'insensitive' } }] } : {}) }, include: { notes: { orderBy: { createdAt: 'desc' }, take: 5 }, _count: { select: { bookings: true } } }, orderBy: { updatedAt: 'desc' } });
  }

  async create(tenantId: string, input: { name: string; email?: string; phone?: string }) {
    const name = input.name.trim();
    if (!name) throw new BadRequestException('El nombre del cliente es obligatorio.');
    return this.prisma.customer.create({ data: { tenantId, name, email: input.email?.trim(), phone: input.phone?.trim() } });
  }

  async addNote(tenantId: string, customerId: string, body: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');
    if (!body.trim()) throw new BadRequestException('La nota no puede estar vacía.');
    return this.prisma.customerNote.create({ data: { customerId, body: body.trim() } });
  }
}

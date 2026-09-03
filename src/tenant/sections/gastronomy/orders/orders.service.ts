import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { CouponsService } from '../../../../coupons/coupons.service.js';
import type { CreateOrderDto, UpdateOrderDto } from './dto/orders.dto.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coupons: CouponsService,
  ) {}

  listOrders(tenantId: string) {
    return this.prisma.order.findMany({
      where: { tenantId },
      include: {
        table: true,
        lines: { include: { catalogItem: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOrder(tenantId: string, dto: CreateOrderDto) {
    if (!dto.lines.length) {
      throw new BadRequestException('El pedido debe tener al menos un ítem.');
    }
    if (
      dto.tableId &&
      !(await this.prisma.restaurantTable.findFirst({
        where: { id: dto.tableId, tenantId },
      }))
    ) {
      throw new BadRequestException('La mesa no pertenece al comercio.');
    }

    const catalog = await this.prisma.catalogItem.findMany({
      where: {
        tenantId,
        id: { in: dto.lines.map((line) => line.catalogItemId) },
        isActive: true,
      },
    });

    if (catalog.length !== new Set(dto.lines.map((line) => line.catalogItemId)).size) {
      throw new BadRequestException('Uno o más ítems no están disponibles.');
    }

    const prices = new Map(catalog.map((item) => [item.id, item.priceCents]));
    const subtotalCents = dto.lines.reduce(
      (sum, line) => sum + line.quantity * prices.get(line.catalogItemId)!,
      0,
    );

    const discount = dto.couponCode
      ? await this.coupons.redeem(tenantId, dto.couponCode, subtotalCents)
      : undefined;

    return this.prisma.order.create({
      data: {
        tenantId,
        tableId: dto.tableId,
        customerName: dto.customerName?.trim(),
        notes: dto.notes?.trim(),
        channel: dto.channel,
        deliveryAddress: dto.deliveryAddress?.trim(),
        deliveryStatus: dto.channel === 'delivery' ? 'pending' : undefined,
        couponCode: discount?.code,
        discountCents: discount?.discountCents ?? 0,
        lines: {
          create: dto.lines.map((line) => ({
            catalogItemId: line.catalogItemId,
            quantity: line.quantity,
            guestName: line.guestName?.trim(),
            unitPriceCents: prices.get(line.catalogItemId)!,
          })),
        },
      },
      include: {
        table: true,
        lines: { include: { catalogItem: true } },
      },
    });
  }

  async createPublicOrder(publicId: string, dto: CreateOrderDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: publicId.trim().toLowerCase() },
      select: { id: true, isActive: true },
    });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Comercio público no disponible.');
    }

    const feature = await this.prisma.tenantFeature.findUnique({
      where: {
        tenantId_featureKey: { tenantId: tenant.id, featureKey: 'orders' },
      },
    });
    if (feature && !feature.isEnabled) {
      throw new BadRequestException('Los pedidos públicos no están habilitados.');
    }

    let tableId = dto.tableId;
    if (tableId) {
      const table = /^[a-f0-9]{24}$/i.test(tableId)
        ? await this.prisma.restaurantTable.findFirst({
            where: { tenantId: tenant.id, id: tableId },
            select: { id: true },
          })
        : await this.prisma.restaurantTable.findFirst({
            where: { tenantId: tenant.id, number: Number(tableId) || -1 },
            select: { id: true },
          });

      if (!table) {
        throw new BadRequestException('La mesa no pertenece al comercio.');
      }
      tableId = table.id;
    }

    return this.createOrder(tenant.id, { ...dto, tableId });
  }

  async updateOrder(tenantId: string, id: string, dto: UpdateOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }

    const { deliveryEta, courierName, courierPhone, ...state } = dto;
    return this.prisma.order.update({
      where: { id },
      data: {
        ...state,
        courierName: courierName?.trim(),
        courierPhone: courierPhone?.trim(),
        deliveryEta: deliveryEta ? new Date(deliveryEta) : undefined,
      },
      include: { lines: true },
    });
  }

  async getOrderTicket(tenantId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        lines: {
          include: {
            catalogItem: { select: { title: true } },
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }

    const totalCents =
      order.lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0) -
      order.discountCents;

    const parts = new Map<
      string,
      {
        totalCents: number;
        lines: Array<{ title: string; quantity: number; amountCents: number }>;
      }
    >();

    order.lines.forEach((line) => {
      const person = line.guestName?.trim() || 'Mesa';
      const current = parts.get(person) || { totalCents: 0, lines: [] };
      const amountCents = line.quantity * line.unitPriceCents;
      current.totalCents += amountCents;
      current.lines.push({
        title: line.catalogItem.title,
        quantity: line.quantity,
        amountCents,
      });
      parts.set(person, current);
    });

    return {
      orderId: order.id,
      totalCents,
      discountCents: order.discountCents,
      parts: [...parts.entries()].map(([person, value]) => ({
        person,
        ...value,
      })),
    };
  }

  async issueFiscalReceipt(tenantId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        lines: {
          include: {
            catalogItem: { select: { title: true } },
          },
        },
        fiscalReceipt: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }
    if (order.fiscalReceipt) {
      return order.fiscalReceipt;
    }

    const totalCents =
      order.lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0) -
      order.discountCents;

    const provider = process.env.FISCAL_PROVIDER || 'mock';
    return this.prisma.fiscalReceipt.create({
      data: {
        tenantId,
        orderId: id,
        provider,
        status: 'issued',
        receiptType: provider === 'mock' ? 'internal' : 'electronic_pending',
        number: `AUREA-${new Date().getUTCFullYear()}-${Date.now()}`,
        totalCents,
        payload: {
          customerName: order.customerName,
          lines: order.lines.map((line) => ({
            title: line.catalogItem.title,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
          })),
        },
      },
    });
  }
}

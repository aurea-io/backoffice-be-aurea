import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { UpdateOrderDto } from '../orders/dto/orders.dto.js';

@Injectable()
export class KitchenService {
  constructor(private readonly prisma: PrismaService) {}

  listKitchenOrders(tenantId: string) {
    return this.prisma.order.findMany({
      where: {
        tenantId,
        status: { in: ['open' as any, 'preparing' as any, 'ready' as any] },
      },
      include: {
        table: true,
        lines: { include: { catalogItem: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateKitchenOrder(tenantId: string, id: string, dto: UpdateOrderDto) {
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
}

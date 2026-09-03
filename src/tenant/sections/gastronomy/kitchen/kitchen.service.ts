import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { OrdersService } from '../../commerce/orders/orders.service.js';
import type { UpdateOrderDto } from '../../commerce/orders/orders.dto.js';

@Injectable()
export class KitchenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  listKitchenOrders(tenantId: string) {
    return this.prisma.order.findMany({
      where: { tenantId, status: { in: ['open' as any, 'preparing' as any, 'ready' as any] } },
      include: { table: true, lines: { include: { catalogItem: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  updateKitchenOrder(tenantId: string, id: string, dto: UpdateOrderDto) {
    return this.orders.updateOrder(tenantId, id, dto);
  }
}

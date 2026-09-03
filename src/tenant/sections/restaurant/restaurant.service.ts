import { Injectable } from '@nestjs/common';
import { TablesService } from '../gastronomy/tables/tables.service.js';
import { OrdersService } from '../gastronomy/orders/orders.service.js';
import { KitchenService } from '../gastronomy/kitchen/kitchen.service.js';
import type {
  CreateTableDto,
  UpdateTableDto,
  CreateTableBookingDto,
  UpdateTableBookingDto,
} from '../gastronomy/tables/dto/tables.dto.js';
import type {
  CreateOrderDto,
  UpdateOrderDto,
} from '../gastronomy/orders/dto/orders.dto.js';

@Injectable()
export class RestaurantService {
  constructor(
    private readonly tablesService: TablesService,
    private readonly ordersService: OrdersService,
    private readonly kitchenService: KitchenService,
  ) {}

  listTables(tenantId: string) {
    return this.tablesService.listTables(tenantId);
  }

  createTable(tenantId: string, dto: CreateTableDto) {
    return this.tablesService.createTable(tenantId, dto);
  }

  updateTable(tenantId: string, id: string, dto: UpdateTableDto) {
    return this.tablesService.updateTable(tenantId, id, dto);
  }

  tableQr(tenantId: string, id: string) {
    return this.tablesService.tableQr(tenantId, id);
  }

  listTableBookings(tenantId: string, from?: string, to?: string) {
    return this.tablesService.listTableBookings(tenantId, from, to);
  }

  createTableBooking(tenantId: string, dto: CreateTableBookingDto) {
    return this.tablesService.createTableBooking(tenantId, dto);
  }

  createTableBookingByPublicId(publicId: string, dto: CreateTableBookingDto) {
    return this.tablesService.createTableBookingByPublicId(publicId, dto);
  }

  updateTableBooking(tenantId: string, id: string, dto: UpdateTableBookingDto) {
    return this.tablesService.updateTableBooking(tenantId, id, dto);
  }

  tableBookingAvailability(publicId: string, date: string, partySize: number) {
    return this.tablesService.tableBookingAvailability(publicId, date, partySize);
  }

  listOrders(tenantId: string) {
    return this.ordersService.listOrders(tenantId);
  }

  listKitchenOrders(tenantId: string) {
    return this.kitchenService.listKitchenOrders(tenantId);
  }

  createOrder(tenantId: string, dto: CreateOrderDto) {
    return this.ordersService.createOrder(tenantId, dto);
  }

  createPublicOrder(publicId: string, dto: CreateOrderDto) {
    return this.ordersService.createPublicOrder(publicId, dto);
  }

  updateOrder(tenantId: string, id: string, dto: UpdateOrderDto) {
    return this.ordersService.updateOrder(tenantId, id, dto);
  }

  getOrderTicket(tenantId: string, id: string) {
    return this.ordersService.getOrderTicket(tenantId, id);
  }

  issueFiscalReceipt(tenantId: string, id: string) {
    return this.ordersService.issueFiscalReceipt(tenantId, id);
  }
}

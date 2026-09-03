import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../../../../core/decorators/public.decorator.js';
import type { CreateTableBookingDto } from '../tables/dto/tables.dto.js';
import type { CreateOrderDto } from '../orders/dto/orders.dto.js';
import { TablesService } from '../tables/tables.service.js';
import { OrdersService } from '../orders/orders.service.js';

@Controller('public/:publicId/restaurant/orders')
export class PublicRestaurantOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post()
  create(
    @Param('publicId') publicId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createPublicOrder(publicId, dto);
  }
}

@Controller('public/:publicId/restaurant/bookings')
export class PublicTableBookingsController {
  constructor(private readonly tablesService: TablesService) {}

  @Public()
  @Get('availability')
  availability(
    @Param('publicId') publicId: string,
    @Query('date') date: string,
    @Query('partySize') partySize = '2',
  ) {
    return this.tablesService.tableBookingAvailability(
      publicId,
      date,
      Number(partySize) || 2,
    );
  }

  @Public()
  @Post()
  create(
    @Param('publicId') publicId: string,
    @Body() dto: CreateTableBookingDto,
  ) {
    return this.tablesService.createTableBookingByPublicId(publicId, dto);
  }
}

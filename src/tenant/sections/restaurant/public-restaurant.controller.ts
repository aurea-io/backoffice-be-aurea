import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../../../core/decorators/public.decorator.js';
import { CreateOrderDto, CreateTableBookingDto } from './dto/restaurant.dto.js';
import { RestaurantService } from './restaurant.service.js';

@Controller('public/:publicId/restaurant/orders')
export class PublicRestaurantOrdersController {
  constructor(private readonly restaurant: RestaurantService) {}

  @Public()
  @Post()
  create(
    @Param('publicId') publicId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.restaurant.createPublicOrder(publicId, dto);
  }
}

@Controller('public/:publicId/restaurant/bookings')
export class PublicTableBookingsController {
  constructor(private readonly restaurant: RestaurantService) {}

  @Public()
  @Get('availability')
  availability(
    @Param('publicId') publicId: string,
    @Query('date') date: string,
    @Query('partySize') partySize = '2',
  ) {
    return this.restaurant.tableBookingAvailability(
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
    return this.restaurant.createTableBookingByPublicId(publicId, dto);
  }
}

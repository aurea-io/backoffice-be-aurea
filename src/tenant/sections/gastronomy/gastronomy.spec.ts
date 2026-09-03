import { describe, it, expect } from 'vitest';
import { FEATURE_DOMAIN_KEY, REQUIRE_ACTION_KEY } from '../../../core/decorators/require-feature.decorator.js';
import { FeatureConstants } from '../../../core/constants/index.js';
import { TablesController } from './tables/tables.controller.js';
import { OrdersController } from './orders/orders.controller.js';
import { KitchenController } from './kitchen/kitchen.controller.js';

describe('Gastronomy Bounded Context Modules & Domain Isolation', () => {
  it('TablesController is annotated with FeatureConstants.TABLES domain', () => {
    const domain = Reflect.getMetadata(FEATURE_DOMAIN_KEY, TablesController);
    expect(domain).toBe(FeatureConstants.TABLES);
    expect(domain).not.toBe(FeatureConstants.BOOKINGS);
  });

  it('OrdersController is annotated with FeatureConstants.ORDERS domain', () => {
    const domain = Reflect.getMetadata(FEATURE_DOMAIN_KEY, OrdersController);
    expect(domain).toBe(FeatureConstants.ORDERS);
  });

  it('KitchenController is annotated with FeatureConstants.KITCHEN domain', () => {
    const domain = Reflect.getMetadata(FEATURE_DOMAIN_KEY, KitchenController);
    expect(domain).toBe(FeatureConstants.KITCHEN);
  });

  it('TablesController methods (tables & table bookings) have correct read and write action metadata', () => {
    const listTablesAction = Reflect.getMetadata(
      REQUIRE_ACTION_KEY,
      TablesController.prototype.listTables,
    );
    expect(listTablesAction).toBe('read');

    const createTableAction = Reflect.getMetadata(
      REQUIRE_ACTION_KEY,
      TablesController.prototype.createTable,
    );
    expect(createTableAction).toBe('write');

    const listBookingsAction = Reflect.getMetadata(
      REQUIRE_ACTION_KEY,
      TablesController.prototype.listBookings,
    );
    expect(listBookingsAction).toBe('read');

    const createBookingAction = Reflect.getMetadata(
      REQUIRE_ACTION_KEY,
      TablesController.prototype.createBooking,
    );
    expect(createBookingAction).toBe('write');
  });

  it('OrdersController methods have correct read and write action metadata', () => {
    const listOrdersAction = Reflect.getMetadata(
      REQUIRE_ACTION_KEY,
      OrdersController.prototype.listOrders,
    );
    expect(listOrdersAction).toBe('read');

    const createOrderAction = Reflect.getMetadata(
      REQUIRE_ACTION_KEY,
      OrdersController.prototype.createOrder,
    );
    expect(createOrderAction).toBe('write');

    const eventsAction = Reflect.getMetadata(
      REQUIRE_ACTION_KEY,
      OrdersController.prototype.events,
    );
    expect(eventsAction).toBe('read');
  });

  it('KitchenController methods have correct read and write action metadata', () => {
    const listKitchenAction = Reflect.getMetadata(
      REQUIRE_ACTION_KEY,
      KitchenController.prototype.listKitchen,
    );
    expect(listKitchenAction).toBe('read');

    const updateKitchenAction = Reflect.getMetadata(
      REQUIRE_ACTION_KEY,
      KitchenController.prototype.updateKitchenOrder,
    );
    expect(updateKitchenAction).toBe('write');
  });
});

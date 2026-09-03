import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RepositoriesModule } from './repositories/repositories.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TenantModule } from './tenant/core/tenant.module.js';
import { CatalogModule } from './tenant/sections/commerce/catalog/catalog.module.js';
import { InvitationsModule } from './tenant/core/invitations/invitations.module.js';
import { JwtAuthGuard } from './core/guards/jwt-auth.guard.js';
import { HealthModule } from './health/health.module.js';
import { ThemeModule } from './tenant/core/theme/theme.module.js';
import { BootstrapModule } from './bootstrap/bootstrap.module.js';
import { AccessModule } from './access/access.module.js';
import { AuditModule } from './audit/audit.module.js';
import { BookingsModule } from './tenant/sections/services/bookings/bookings.module.js';
import { InventoryModule } from './tenant/sections/commerce/inventory/inventory.module.js';
import { OrdersModule } from './tenant/sections/commerce/orders/orders.module.js';
import { PosModule } from './tenant/sections/commerce/pos/pos.module.js';
import { TablesModule } from './tenant/sections/gastronomy/tables/tables.module.js';
import { KitchenModule } from './tenant/sections/gastronomy/kitchen/kitchen.module.js';
import { ClientsModule } from './tenant/sections/crm/clients/clients.module.js';
import { LoyaltyModule } from './tenant/sections/marketing/loyalty/loyalty.module.js';
import { CouponsModule } from './tenant/sections/marketing/coupons/coupons.module.js';
import { SubscriptionGuard } from './core/guards/subscription.guard.js';
import { PaymentsModule } from './payments/payments.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    RepositoriesModule,
    AuthModule,
    TenantModule,
    CatalogModule,
    InvitationsModule,
    HealthModule,
    ThemeModule,
    BootstrapModule,
    AccessModule,
    AuditModule,
    BookingsModule,
    InventoryModule,
    OrdersModule,
    PosModule,
    TablesModule,
    KitchenModule,
    ClientsModule,
    LoyaltyModule,
    CouponsModule,
    PaymentsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard,
    },
  ],
})
export class AppModule {}

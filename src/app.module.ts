import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RepositoriesModule } from './repositories/repositories.module.js';
import { AuthModule } from './auth/auth.module.js';
import { SuperadminModule } from './platform/superadmin/superadmin.module.js';
import { TenantModule } from './tenant/core/tenant.module.js';
import { CatalogModule } from './tenant/sections/commerce/catalog/catalog.module.js';
import { InvitationsModule } from './tenant/core/invitations/invitations.module.js';
import { JwtAuthGuard } from './core/guards/jwt-auth.guard.js';
import { HealthModule } from './health/health.module.js';
import { ThemeModule } from './tenant/core/theme/theme.module.js';
import { BootstrapModule } from './bootstrap/bootstrap.module.js';
import { AccessModule } from './access/access.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AppointmentsModule } from './tenant/sections/appointments/appointments.module.js';
import { InventoryModule } from './tenant/sections/inventory/inventory.module.js';
import { RestaurantModule } from './tenant/sections/restaurant/restaurant.module.js';
import { PosModule } from './tenant/sections/pos/pos.module.js';
import { ClientsModule } from './tenant/sections/clients/clients.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    RepositoriesModule,
    AuthModule,
    SuperadminModule,
    TenantModule,
    CatalogModule,
    InvitationsModule,
    HealthModule,
    ThemeModule,
    BootstrapModule,
    AccessModule,
    AuditModule,
    AppointmentsModule,
    InventoryModule,
    RestaurantModule,
    PosModule,
    ClientsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

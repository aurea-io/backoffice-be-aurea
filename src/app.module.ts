import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RepositoriesModule } from './repositories/repositories.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TenantModule } from './tenant/core/tenant.module.js';
import { InvitationsModule } from './tenant/core/invitations/invitations.module.js';

import { JwtAuthGuard } from './core/guards/jwt-auth.guard.js';
import { HealthModule } from './health/health.module.js';
import { ThemeModule } from './tenant/core/theme/theme.module.js';
import { BootstrapModule } from './bootstrap/bootstrap.module.js';
import { AccessModule } from './access/access.module.js';
import { AuditModule } from './audit/audit.module.js';
import { CommerceModule } from './tenant/sections/commerce/commerce.module.js';
import { GastronomyModule } from './tenant/sections/gastronomy/gastronomy.module.js';
import { ServicesModule } from './tenant/sections/services/services.module.js';
import { ClientsModule } from './tenant/sections/clients/clients.module.js';
import { SubscriptionGuard } from './core/guards/subscription.guard.js';
import { PaymentsModule } from './payments/payments.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { CouponsModule } from './coupons/coupons.module.js';

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
    InvitationsModule,
    HealthModule,
    ThemeModule,
    BootstrapModule,
    AccessModule,
    AuditModule,
    CommerceModule,
    GastronomyModule,
    ServicesModule,
    ClientsModule,
    PaymentsModule,
    NotificationsModule,
    CouponsModule,
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

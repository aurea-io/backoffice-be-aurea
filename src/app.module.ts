import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RepositoriesModule } from './repositories/repositories.module.js';
import { AuthModule } from './auth/auth.module.js';
import { SuperadminModule } from './superadmin/superadmin.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { InvitationsModule } from './invitations/invitations.module.js';
import { JwtAuthGuard } from './core/guards/jwt-auth.guard.js';

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

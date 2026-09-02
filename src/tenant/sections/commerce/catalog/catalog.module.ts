import { Module } from '@nestjs/common';
import { CatalogController, PublicCatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';
import { AuthModule } from '../../../../auth/auth.module.js';
import { ModuleCatalogRepository } from './module-catalog.repository.js';
import { PrismaModule } from '../../../../prisma/prisma.module.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CatalogController, PublicCatalogController],
  providers: [CatalogService, ModuleCatalogRepository],
  exports: [CatalogService, ModuleCatalogRepository],
})
export class CatalogModule {}

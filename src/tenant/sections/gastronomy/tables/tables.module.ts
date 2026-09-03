import { Module } from '@nestjs/common';
import { AuthModule } from '../../../../auth/auth.module.js';
import { PrismaModule } from '../../../../prisma/prisma.module.js';
import { TablesController, PublicTableBookingsController } from './tables.controller.js';
import { TablesService } from './tables.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TablesController, PublicTableBookingsController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../../../../auth/auth.module.js';
import { PrismaModule } from '../../../../prisma/prisma.module.js';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}

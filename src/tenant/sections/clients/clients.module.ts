import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module.js';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';
import { LoyaltyController } from './loyalty.controller.js';
import { LoyaltyService } from './loyalty.service.js';

@Module({ imports: [PrismaModule], controllers: [ClientsController, LoyaltyController], providers: [ClientsService, LoyaltyService] })
export class ClientsModule {}

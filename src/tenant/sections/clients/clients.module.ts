import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module.js';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';

@Module({ imports: [PrismaModule], controllers: [ClientsController], providers: [ClientsService] })
export class ClientsModule {}

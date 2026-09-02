import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PaymentsController, PublicPaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({ imports: [PrismaModule], controllers: [PaymentsController, PublicPaymentsController], providers: [PaymentsService] })
export class PaymentsModule {}

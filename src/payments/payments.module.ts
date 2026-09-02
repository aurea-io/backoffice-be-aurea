import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PaymentsController, PublicPaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({ imports: [AuthModule, PrismaModule], controllers: [PaymentsController, PublicPaymentsController], providers: [PaymentsService] })
export class PaymentsModule {}

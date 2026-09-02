import { Module } from '@nestjs/common';
import { AuthModule } from '../../../auth/auth.module.js';
import { AppointmentsController, PublicAppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';
import { NotificationsModule } from '../../../notifications/notifications.module.js';

@Module({ imports: [AuthModule, NotificationsModule], controllers: [AppointmentsController, PublicAppointmentsController], providers: [AppointmentsService] })
export class AppointmentsModule {}

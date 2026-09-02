import { Module } from '@nestjs/common';
import { AppointmentsController, PublicAppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';
import { NotificationsModule } from '../../../notifications/notifications.module.js';

@Module({ imports: [NotificationsModule], controllers: [AppointmentsController, PublicAppointmentsController], providers: [AppointmentsService] })
export class AppointmentsModule {}

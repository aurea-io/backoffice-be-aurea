import { Module } from '@nestjs/common';
import { AppointmentsController, PublicAppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';

@Module({ controllers: [AppointmentsController, PublicAppointmentsController], providers: [AppointmentsService] })
export class AppointmentsModule {}

import { Module } from '@nestjs/common';
import { SuperadminController } from './superadmin.controller.js';
import { SuperadminTenantsService } from './tenants.service.js';
import { InvitationsModule } from '../../tenant/core/invitations/invitations.module.js';
import { PlansController } from './plans.controller.js';
import { PlansService } from './plans.service.js';
import { AuditModule } from '../../audit/audit.module.js';

@Module({
  imports: [InvitationsModule, AuditModule],
  controllers: [SuperadminController, PlansController],
  providers: [SuperadminTenantsService, PlansService],
  exports: [SuperadminTenantsService],
})
export class SuperadminModule {}

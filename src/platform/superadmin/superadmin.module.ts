import { Module } from '@nestjs/common';
import { SuperadminController } from './superadmin.controller.js';
import { SuperadminTenantsService } from './tenants.service.js';
import { InvitationsModule } from '../../tenant/core/invitations/invitations.module.js';

@Module({
  imports: [InvitationsModule],
  controllers: [SuperadminController],
  providers: [SuperadminTenantsService],
  exports: [SuperadminTenantsService],
})
export class SuperadminModule {}

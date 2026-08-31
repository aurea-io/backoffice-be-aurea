import { Module } from '@nestjs/common';
import { SuperadminController } from './superadmin.controller.js';
import { SuperadminTenantsService } from './tenants.service.js';

@Module({
  controllers: [SuperadminController],
  providers: [SuperadminTenantsService],
  exports: [SuperadminTenantsService],
})
export class SuperadminModule {}

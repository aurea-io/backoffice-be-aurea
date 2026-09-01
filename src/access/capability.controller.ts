import { Controller, Get, Headers } from '@nestjs/common';
import { CurrentUser } from '../core/decorators/current-user.decorator.js';
import type { JwtPayload } from '../core/interfaces/context.interface.js';
import { CapabilityService } from './capability.service.js';

@Controller('auth')
export class CapabilityController {
  constructor(private readonly capabilityService: CapabilityService) {}

  @Get('me/capabilities')
  async getMyCapabilities(
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    if (!tenantId) {
      return { map: {}, tree: [] };
    }
    return this.capabilityService.evaluateForTenant(user.sub, tenantId, 'private');
  }
}

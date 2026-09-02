import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantContextGuard } from '../core/guards/tenant.guard.js';
import { FeatureGuard } from '../core/guards/feature.guard.js';
import { RolesGuard } from '../core/guards/roles.guard.js';
import { RequireFeature } from '../core/decorators/require-feature.decorator.js';
import { RequirePermissions } from '../core/decorators/permissions.decorator.js';
import { Roles } from '../core/decorators/roles.decorator.js';
import { CurrentTenant } from '../core/decorators/tenant-context.decorator.js';
import { FeatureConstants } from '../core/constants/index.js';
import type { TenantContext } from '../core/interfaces/context.interface.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard)
@RequireFeature(FeatureConstants.NOTIFICATIONS)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() @RequirePermissions('notifications:read') list(@CurrentTenant() tenant: TenantContext) { return this.notifications.list(tenant.tenantId); }
  @Post('test') @Roles(Role.OWNER, Role.MANAGER) @RequirePermissions('notifications:write') test(@CurrentTenant() tenant: TenantContext, @Body() input: { channel: 'email' | 'whatsapp'; recipient: string; body: string }) { return this.notifications.enqueue({ ...input, tenantId: tenant.tenantId, subject: 'Prueba de notificaciones Aurea' }); }
  @Post(':id/retry') @Roles(Role.OWNER, Role.MANAGER) @RequirePermissions('notifications:write') retry(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) { return this.notifications.retry(tenant.tenantId, id); }
}

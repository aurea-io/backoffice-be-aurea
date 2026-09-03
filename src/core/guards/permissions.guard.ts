import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { TenantContext } from '../interfaces/context.interface.js';
import { hasPermissions } from './permissions.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest();
    const tenant: TenantContext | undefined = request.tenantContext;
    if (!tenant) throw new ForbiddenException('Tenant context not found.');

    const granted = tenant.permissions ?? [];
    if (hasPermissions(granted, required)) {
      return true;
    }
    throw new ForbiddenException('Permission denied for this operation.');
  }
}

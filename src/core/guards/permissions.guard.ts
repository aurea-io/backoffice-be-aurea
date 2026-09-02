import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRED_PERMISSIONS_KEY,
  FEATURE_DOMAIN_KEY,
  REQUIRE_ACTION_KEY,
} from '../decorators/permissions.decorator.js';
import type { TenantContext } from '../interfaces/context.interface.js';
import { hasPermissions } from './permissions.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const explicitRequired = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const domain = this.reflector.getAllAndOverride<string>(
      FEATURE_DOMAIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    const action = this.reflector.get<string>(
      REQUIRE_ACTION_KEY,
      context.getHandler(),
    );

    const hasExplicit = Boolean(explicitRequired?.length);
    const hasDomainAction = Boolean(domain && action);

    if (!hasExplicit && !hasDomainAction) return true;

    const request = context.switchToHttp().getRequest();
    const tenant: TenantContext | undefined = request.tenantContext;
    if (!tenant) throw new ForbiddenException('Tenant context not found.');
    if (tenant.role === 'OWNER' || tenant.role === 'SUPERADMIN') return true;

    const granted = tenant.permissions ?? [];

    if (hasExplicit && !hasPermissions(granted, explicitRequired!)) {
      throw new ForbiddenException('Permission denied for this operation.');
    }

    if (hasDomainAction && domain && action) {
      const shortDomain = domain.split('.').pop() ?? domain;
      const candidates = [
        `${domain}:${action}`,
        `${domain}.${action}`,
        `${shortDomain}:${action}`,
        `${shortDomain}.${action}`,
      ];
      const hasDomainPermission =
        granted.includes('*') || candidates.some((c) => granted.includes(c));

      if (!hasDomainPermission) {
        throw new ForbiddenException('Permission denied for this operation.');
      }
    }

    return true;
  }

}

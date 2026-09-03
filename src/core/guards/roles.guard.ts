import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { TenantRepository } from '../../repositories/index.js';

/**
 * RolesGuard resolves access based on:
 * 1. PlatformMembership — any active platform membership grants platform-level access.
 *    Read-only memberships allow GET/HEAD/OPTIONS only.
 * 2. Tenant-level permissions — wildcard (*) or explicit permissions.
 * 3. Role enum values from the DB — compared dynamically, never hardcoded.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantRepo: TenantRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('User is not authenticated.');
    }

    // 1. Check if user has any active platform membership
    const platformMembership = await this.tenantRepo.findPlatformMembership(userId);

    if (requiredRoles.includes('PLATFORM_ACCESS')) {
      if (platformMembership) {
        const isReadonly = platformMembership.roleKey === 'platform_readonly';
        if (isReadonly) {
          const method = String(request.method ?? 'GET').toUpperCase();
          if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
          throw new ForbiddenException('INSUFFICIENT_PERMISSION: platform_readonly is read-only.');
        }
        return true;
      }
      throw new ForbiddenException(
        'Restricted access: Platform privileges required.',
      );
    }

    // 2. Check role in current Tenant context
    const tenantContext = request.tenantContext;
    if (!tenantContext) {
      throw new ForbiddenException(
        'Tenant context not found. The x-tenant-id header is required to verify permissions.',
      );
    }

    // Wildcard permissions grant full access within the tenant
    const permissions = tenantContext.permissions ?? [];
    const hasAllPermissions = permissions.includes('*') || permissions.includes('ALL');
    if (hasAllPermissions) {
      return true;
    }

    // Dynamic role comparison — roles come from the DB, not from hardcoded enums
    const userRole = String(tenantContext.role ?? '').toUpperCase();
    const hasRole = requiredRoles.some((r) => r.toUpperCase() === userRole) ||
      (permissions.includes('tenant:employees:manage') && requiredRoles.some((r) => r.toUpperCase() === 'MANAGER'));

    if (!hasRole) {
      throw new ForbiddenException(
        `Permission denied: Your role (${tenantContext.role}) lacks required permissions. Required: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}

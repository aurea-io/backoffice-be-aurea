import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { TenantRepository } from '../../repositories/index.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantRepo: TenantRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
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

    // 1. Check if user is a global platform SUPERADMIN
    const userSuperadminMembership = await (this.tenantRepo as any).findPlatformMembership?.(userId, 'SUPERADMIN') ?? await (this.tenantRepo as any).findSuperadminMembership?.(userId);
    const platformOwner = await (this.tenantRepo as any).findPlatformMembership?.(userId, 'platform_owner');
    const platformReadonly = await (this.tenantRepo as any).findPlatformMembership?.(userId, 'platform_readonly');
    const isGlobalSuperadmin = Boolean(userSuperadminMembership || platformOwner);

    if (requiredRoles.includes(Role.SUPERADMIN)) {
      if (isGlobalSuperadmin) {
        return true;
      }
      if (platformReadonly) {
        const method = String(request.method ?? 'GET').toUpperCase();
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
        throw new ForbiddenException('INSUFFICIENT_PERMISSION: platform_readonly is read-only.');
      }
      throw new ForbiddenException(
        'Restricted access: AUREA Platform Superadmin privileges required.',
      );
    }

    // 2. Check role in current Tenant context
    const tenantContext = request.tenantContext;
    if (!tenantContext) {
      throw new ForbiddenException(
        'Tenant context not found. The x-tenant-id header is required to verify permissions.',
      );
    }

    // OWNER has complete access within their tenant
    const permissions = tenantContext.permissions ?? [];
    const hasAllPermissions = permissions.includes('*') || permissions.includes('ALL');
    const isOwnerLike = tenantContext.role === Role.OWNER || tenantContext.roleKey === 'tenant_owner' || hasAllPermissions;
    if (isOwnerLike) {
      return true;
    }

    const isManagerLike = tenantContext.role === Role.MANAGER ||
      tenantContext.roleKey === 'tenant_manager' ||
      permissions.includes('tenant:employees:manage');
    const hasRole = requiredRoles.includes(tenantContext.role) ||
      (requiredRoles.includes(Role.MANAGER) && isManagerLike) ||
      (requiredRoles.includes(Role.STAFF) && Boolean(tenantContext.roleKey));
    if (!hasRole) {
      throw new ForbiddenException(
        `Permission denied: Your role (${tenantContext.role}) lacks required permissions. Required: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}

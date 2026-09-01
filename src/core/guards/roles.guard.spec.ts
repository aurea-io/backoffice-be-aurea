import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard.js';
import { ForbiddenException } from '@nestjs/common';

describe('RolesGuard (RBAC)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let mockTenantRepo: any;

  beforeEach(() => {
    reflector = new Reflector();
    mockTenantRepo = {
      findPlatformMembership: vi.fn(),
    };
    guard = new RolesGuard(reflector, mockTenantRepo);
  });

  const createMockContext = (
    requiredRoles?: Role[],
    user?: { sub: string },
    tenantContext?: { role: Role },
  ) => {
    reflector.getAllAndOverride = () => requiredRoles;

    return {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          tenantContext,
        }),
      }),
    } as any;
  };

  it('should allow access if no roles are required', async () => {
    const context = createMockContext(undefined, { sub: 'u1' });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow platform superadmin access to platform route', async () => {
    mockTenantRepo.findPlatformMembership.mockResolvedValue({ id: 'm1', role: Role.SUPERADMIN });
    const context = createMockContext([Role.SUPERADMIN], { sub: 'u1' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny non-superadmin access to superadmin route', async () => {
    mockTenantRepo.findPlatformMembership.mockResolvedValue(null);
    const context = createMockContext([Role.SUPERADMIN], { sub: 'u1' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow OWNER access in tenant context', async () => {
    mockTenantRepo.findPlatformMembership.mockResolvedValue(null);
    const context = createMockContext([Role.MANAGER], { sub: 'u1' }, { role: Role.OWNER });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow MANAGER access when MANAGER role is in required list', async () => {
    mockTenantRepo.findPlatformMembership.mockResolvedValue(null);
    const context = createMockContext([Role.MANAGER, Role.OWNER], { sub: 'u1' }, { role: Role.MANAGER });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny STAFF access when MANAGER role is required', async () => {
    mockTenantRepo.findPlatformMembership.mockResolvedValue(null);
    const context = createMockContext([Role.MANAGER], { sub: 'u1' }, { role: Role.STAFF });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});

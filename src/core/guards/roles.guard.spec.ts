import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
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
    requiredRoles?: string[],
    user?: { sub: string },
    tenantContext?: { role: string; permissions?: string[] },
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

  it('should allow platform member access to platform route', async () => {
    mockTenantRepo.findPlatformMembership.mockResolvedValue({ id: 'm1', roleKey: 'platform_admin' });
    const context = createMockContext(['PLATFORM_ACCESS'], { sub: 'u1' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny non-platform member access to platform route', async () => {
    mockTenantRepo.findPlatformMembership.mockResolvedValue(null);
    const context = createMockContext(['PLATFORM_ACCESS'], { sub: 'u1' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow wildcard permission access in tenant context', async () => {
    mockTenantRepo.findPlatformMembership.mockResolvedValue(null);
    const context = createMockContext(['MANAGER'], { sub: 'u1' }, { role: 'OWNER', permissions: ['*'] });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow MANAGER access when MANAGER role is in required list', async () => {
    mockTenantRepo.findPlatformMembership.mockResolvedValue(null);
    const context = createMockContext(['MANAGER', 'OWNER'], { sub: 'u1' }, { role: 'MANAGER', permissions: [] });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny STAFF access when MANAGER role is required', async () => {
    mockTenantRepo.findPlatformMembership.mockResolvedValue(null);
    const context = createMockContext(['MANAGER'], { sub: 'u1' }, { role: 'STAFF', permissions: [] });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});

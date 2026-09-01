import { describe, expect, it } from 'vitest';
import { RolePolicy } from './role-policy.js';

describe('RolePolicy', () => {
  const policy = new RolePolicy();

  it('keeps platform ownership separate from tenant roles', () => {
    const permissions = policy.resolvePermissions({
      tenantId: 'tenant-a',
      assignments: [
        { roleKey: 'platform_readonly', scope: 'platform', isActive: true },
        { roleKey: 'tenant_owner', scope: 'tenant', tenantId: 'tenant-a', isActive: true },
      ],
    });
    expect(permissions).toEqual(['platform:read', 'tenant:employees:manage', 'tenant:roles:manage']);
  });

  it('does not leak a role from another tenant', () => {
    expect(policy.canManageTenantEmployees({
      tenantId: 'tenant-a',
      assignments: [{ roleKey: 'tenant_owner', scope: 'tenant', tenantId: 'tenant-b', isActive: true }],
    })).toBe(false);
  });

  it('supports future role keys through the persisted permission matrix', () => {
    expect(policy.resolvePermissions({
      tenantId: 'tenant-a',
      assignments: [{ roleKey: 'tenant_manager', scope: 'tenant', tenantId: 'tenant-a', isActive: true }],
    })).toContain('tenant:employees:manage');
  });

  it('honors inactive assignments', () => {
    expect(policy.canManageTenantEmployees({
      tenantId: 'tenant-a',
      assignments: [{ roleKey: 'tenant_owner', scope: 'tenant', tenantId: 'tenant-a', isActive: false }],
    })).toBe(false);
  });
});

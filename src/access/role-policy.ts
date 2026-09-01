export type RoleScope = 'platform' | 'tenant';

export interface RoleDefinition {
  key: string;
  scope: RoleScope;
  permissions: string[];
  isActive: boolean;
}

export interface RoleAssignment {
  roleKey: string;
  scope: RoleScope;
  isActive: boolean;
  tenantId?: string;
}

export interface RoleContext {
  tenantId?: string;
  assignments: RoleAssignment[];
}

export class RolePolicy {
  resolvePermissions(context: RoleContext): string[] {
    const permissions = new Set<string>();
    for (const assignment of context.assignments) {
      if (!assignment.isActive) continue;
      if (assignment.scope === 'tenant' && assignment.tenantId !== context.tenantId) continue;
      for (const permission of assignment.roleKey === '*' ? ['*'] : this.permissionsFor(assignment.roleKey)) {
        permissions.add(permission);
      }
    }
    return [...permissions].sort();
  }

  canManageTenantEmployees(context: RoleContext): boolean {
    return this.resolvePermissions(context).some(
      (permission) => permission === '*' || permission === 'tenant:employees:manage',
    );
  }

  private permissionsFor(roleKey: string): string[] {
    return ROLE_PERMISSIONS[roleKey] ?? [];
  }
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  platform_owner: ['*'],
  platform_readonly: ['platform:read'],
  tenant_owner: ['tenant:employees:manage', 'tenant:roles:manage'],
  tenant_manager: ['tenant:employees:read', 'tenant:employees:manage'],
  tenant_staff: ['tenant:employees:read'],
};

export class RoleConstants {
  static readonly SUPERADMIN = 'SUPERADMIN' as const;
  static readonly OWNER = 'OWNER' as const;
  static readonly MANAGER = 'MANAGER' as const;
  static readonly STAFF = 'STAFF' as const;
  static readonly CASHIER = 'CASHIER' as const;
  static readonly ALL_PERMISSIONS = '*' as const;
}

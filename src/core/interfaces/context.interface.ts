import type { Role } from '@prisma/client';
import type { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface TenantContext {
  tenantId: string;
  slug: string;
  name: string;
  vertical: string;
  role: Role;
  roleKey?: string;
  permissions: string[];
  activeFeatures: string[];
  settings?: Record<string, any>;
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
  deprecatedAt?: Date | null;
  publicAccessUntil?: Date | null;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  hasPlatformAccess?: boolean;
}

export interface RequestWithContext extends Request {
  user?: JwtPayload;
  tenantContext?: TenantContext;
}

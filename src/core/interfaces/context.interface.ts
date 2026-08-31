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
  permissions: string[];
  activeFeatures: string[];
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  isAureaSuperadmin?: boolean;
}

export interface RequestWithContext extends Request {
  user?: JwtPayload;
  tenantContext?: TenantContext;
}

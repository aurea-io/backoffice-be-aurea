import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';
import { MetadataConstants } from '../constants/index.js';

export const ROLES_KEY = MetadataConstants.ROLES;
export const Roles = (...roles: Role[]) => SetMetadata(MetadataConstants.ROLES, roles);

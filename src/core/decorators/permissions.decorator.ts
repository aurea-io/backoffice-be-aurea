import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS_KEY = 'required_permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export {
  FeatureDomain,
  RequireRead,
  RequireWrite,
  FEATURE_DOMAIN_KEY,
  REQUIRE_ACTION_KEY,
} from './require-feature.decorator.js';


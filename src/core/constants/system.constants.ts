import { FeatureConstants } from './feature.constants.js';

export class SystemConstants {
  static readonly SYSTEM_TENANT_SLUG = 'aurea-platform';
  static readonly SYSTEM_TENANT_NAME = 'Aurea Platform System';
  static readonly SYSTEM_VERTICAL = 'system';
  static readonly DEFAULT_BASE_FEATURES = [
    FeatureConstants.CATALOG,
    FeatureConstants.SOCIAL_HUB,
  ] as const;
  static readonly DEFAULT_PORT = 3000;
  static readonly DEFAULT_FRONTEND_URL = 'http://localhost:5173';
  static readonly DEFAULT_JWT_SECRET =
    'aurea_dev_super_secret_jwt_key_change_in_production_123456789';
  static readonly GLOBAL_API_PREFIX = 'api';
}

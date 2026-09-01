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
  static readonly DEFAULT_JWT_SECRET = 'local-development-key-change-me';
  static readonly GLOBAL_API_PREFIX = 'api';
}

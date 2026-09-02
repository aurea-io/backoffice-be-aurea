import { SetMetadata } from '@nestjs/common';
import { MetadataConstants } from '../constants/index.js';

export const REQUIRE_FEATURE_KEY = MetadataConstants.REQUIRE_FEATURE;
export const FEATURE_DOMAIN_KEY = MetadataConstants.FEATURE_DOMAIN;
export const REQUIRE_ACTION_KEY = MetadataConstants.REQUIRE_ACTION;

export const RequireFeature = (featureKey: string) =>
  SetMetadata(REQUIRE_FEATURE_KEY, featureKey);

export const FeatureDomain = (domain: string) =>
  SetMetadata(FEATURE_DOMAIN_KEY, domain);

export const RequireRead = (subAction?: string) =>
  SetMetadata(REQUIRE_ACTION_KEY, subAction ? `read.${subAction}` : 'read');

export const RequireWrite = (subAction?: string) =>
  SetMetadata(REQUIRE_ACTION_KEY, subAction ? `write.${subAction}` : 'write');


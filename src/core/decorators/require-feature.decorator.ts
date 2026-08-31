import { SetMetadata } from '@nestjs/common';
import { MetadataConstants } from '../constants/index.js';

export const REQUIRE_FEATURE_KEY = MetadataConstants.REQUIRE_FEATURE;
export const RequireFeature = (featureKey: string) =>
  SetMetadata(MetadataConstants.REQUIRE_FEATURE, featureKey);

import { SetMetadata } from '@nestjs/common';

export const FEATURE_DOMAIN_KEY = 'feature_domain';
export const FeatureDomain = (domain: string) => SetMetadata(FEATURE_DOMAIN_KEY, domain);

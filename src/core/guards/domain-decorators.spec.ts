import { describe, it, expect, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard.js';
import { FeatureGuard } from './feature.guard.js';
import {
  FEATURE_DOMAIN_KEY,
  REQUIRE_ACTION_KEY,
  REQUIRE_FEATURE_KEY,
} from '../decorators/require-feature.decorator.js';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';

describe('Domain Decorators and Guards Composition', () => {
  let reflector: Reflector;
  let permissionsGuard: PermissionsGuard;
  let featureGuard: FeatureGuard;

  beforeEach(() => {
    reflector = new Reflector();
    permissionsGuard = new PermissionsGuard(reflector);
    featureGuard = new FeatureGuard(reflector);
  });

  const createMockContext = (options: {
    domain?: string;
    action?: string;
    explicitPermissions?: string[];
    explicitFeature?: string;
    tenantContext?: any;
  }) => {
    reflector.getAllAndOverride = (key: any) => {
      if (key === FEATURE_DOMAIN_KEY) return options.domain;
      if (key === REQUIRED_PERMISSIONS_KEY) return options.explicitPermissions;
      if (key === REQUIRE_FEATURE_KEY) return options.explicitFeature;
      return undefined;
    };
    reflector.get = (key: any) => {
      if (key === REQUIRE_ACTION_KEY) return options.action;
      if (key === FEATURE_DOMAIN_KEY) return options.domain;
      return undefined;
    };

    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          tenantContext: options.tenantContext,
        }),
      }),
    } as any;
  };

  describe('FeatureGuard with @FeatureDomain', () => {
    it('allows access when tenant has the domain feature enabled', () => {
      const context = createMockContext({
        domain: 'catalog',
        tenantContext: { tenantId: 'tenant-1', activeFeatures: ['catalog'] },
      });
      expect(featureGuard.canActivate(context)).toBe(true);
    });

    it('denies access when tenant lacks the domain feature', () => {
      const context = createMockContext({
        domain: 'catalog',
        tenantContext: { tenantId: 'tenant-1', activeFeatures: ['appointments'] },
      });
      expect(() => featureGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('PermissionsGuard with @FeatureDomain + @RequireRead / @RequireWrite', () => {
    it('allows read when user has short domain colon permission', () => {
      const context = createMockContext({
        domain: 'commerce.catalog',
        action: 'read',
        tenantContext: {
          role: 'STAFF',
          permissions: ['catalog:read'],
        },
      });
      expect(permissionsGuard.canActivate(context)).toBe(true);
    });

    it('allows read when user has full domain dot permission', () => {
      const context = createMockContext({
        domain: 'commerce.catalog',
        action: 'read',
        tenantContext: {
          role: 'STAFF',
          permissions: ['commerce.catalog.read'],
        },
      });
      expect(permissionsGuard.canActivate(context)).toBe(true);
    });

    it('allows write when user has catalog:write', () => {
      const context = createMockContext({
        domain: 'catalog',
        action: 'write',
        tenantContext: {
          role: 'STAFF',
          permissions: ['catalog:write'],
        },
      });
      expect(permissionsGuard.canActivate(context)).toBe(true);
    });

    it('denies write when user only has read permission', () => {
      const context = createMockContext({
        domain: 'catalog',
        action: 'write',
        tenantContext: {
          role: 'STAFF',
          permissions: ['catalog:read'],
        },
      });
      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('always allows OWNER regardless of explicit permissions', () => {
      const context = createMockContext({
        domain: 'catalog',
        action: 'write',
        tenantContext: {
          role: 'OWNER',
          permissions: [],
        },
      });
      expect(permissionsGuard.canActivate(context)).toBe(true);
    });
  });
});

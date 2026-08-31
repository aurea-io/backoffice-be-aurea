import { describe, it, expect, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import { FeatureGuard } from './feature.guard.js';
import { ForbiddenException } from '@nestjs/common';

describe('FeatureGuard (FBAC)', () => {
  let guard: FeatureGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new FeatureGuard(reflector);
  });

  const createMockContext = (
    requiredFeature?: string,
    tenantContext?: { activeFeatures: string[] },
  ) => {
    reflector.getAllAndOverride = () => requiredFeature;

    return {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({
          tenantContext,
        }),
      }),
    } as any;
  };

  it('should allow access if no feature is required', () => {
    const context = createMockContext(undefined, undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if tenant has the required feature enabled', () => {
    const context = createMockContext('catalog', {
      activeFeatures: ['catalog', 'social_hub'],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if tenant context is missing', () => {
    const context = createMockContext('catalog', undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if tenant does not have the feature enabled', () => {
    const context = createMockContext('bookings', {
      activeFeatures: ['catalog'],
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

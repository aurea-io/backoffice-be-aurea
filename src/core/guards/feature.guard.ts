import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator.js';
import type { TenantContext } from '../interfaces/context.interface.js';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantContext: TenantContext | undefined = request.tenantContext;

    if (!tenantContext) {
      throw new ForbiddenException(
        'Tenant context not found. Ensure the x-tenant-id header is provided.',
      );
    }

    const hasFeature = tenantContext.activeFeatures.includes(requiredFeature);

    if (!hasFeature) {
      throw new ForbiddenException(
        `This tenant does not have the '${requiredFeature}' module enabled or subscribed.`,
      );
    }

    return true;
  }
}

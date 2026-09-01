import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator.js';
import { CapabilityService } from '../../access/capability.service.js';
import type { JwtPayload, TenantContext } from '../interfaces/context.interface.js';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly capabilityService?: CapabilityService,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) return true;

    const request = context.switchToHttp().getRequest();
    const tenantContext: TenantContext | undefined = request.tenantContext;
    const user: JwtPayload | undefined = request.user;

    if (!tenantContext) {
      throw new ForbiddenException(
        'Tenant context not found. Ensure the x-tenant-id header is provided.',
      );
    }

    if (!this.capabilityService || !user?.sub || !tenantContext.tenantId) {
      if (!tenantContext.activeFeatures.includes(requiredFeature)) {
        throw new ForbiddenException(
          `This tenant does not have the '${requiredFeature}' capability enabled.`,
        );
      }
      return true;
    }

    return this.capabilityService.isEnabled(
      user.sub,
      tenantContext.tenantId,
      requiredFeature,
    ).then((enabled) => {
      if (!enabled) {
        throw new ForbiddenException(
          `This tenant does not have the '${requiredFeature}' capability enabled.`,
        );
      }
      return true;
    });
  }
}

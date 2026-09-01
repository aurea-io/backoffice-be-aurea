import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator.js';
import { CapabilityService } from '../../access/capability.service.js';
import type { JwtPayload, TenantContext } from '../interfaces/context.interface.js';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly capabilityService: CapabilityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) return true;

    const request = context.switchToHttp().getRequest();
    const tenantContext: TenantContext | undefined = request.tenantContext;
    const user: JwtPayload | undefined = request.user;

    if (!tenantContext || !user) {
      throw new ForbiddenException('Tenant and authenticated user context are required.');
    }

    const hasFeature = await this.capabilityService.isEnabled(
      user.sub,
      tenantContext.tenantId,
      requiredFeature,
    );

    if (!hasFeature) {
      throw new ForbiddenException(
        `This tenant does not have the '${requiredFeature}' capability enabled.`,
      );
    }

    return true;
  }
}

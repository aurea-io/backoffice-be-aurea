import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from '../../auth/auth.service.js';

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('User is not authenticated.');
    }

    // Read the 'x-tenant-id' header or route params
    const tenantId =
      (request.headers['x-tenant-id'] as string) ||
      (request.params?.tenantId as string);

    if (!tenantId) {
      throw new BadRequestException(
        'Header x-tenant-id is required to operate within a tenant context.',
      );
    }

    const { currentContext } = await this.authService.validateUserContext(
      userId,
      tenantId,
    );

    if (!currentContext) {
      throw new UnauthorizedException(
        'You do not have access to this tenant or it is inactive.',
      );
    }

    request.tenantContext = currentContext;
    return true;
  }
}

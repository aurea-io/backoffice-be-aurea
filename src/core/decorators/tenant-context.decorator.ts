import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { TenantContext } from '../interfaces/context.interface.js';

export const CurrentTenant = createParamDecorator(
  (data: keyof TenantContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContext = request.tenantContext as TenantContext;
    return data ? tenantContext?.[data] : tenantContext;
  },
);

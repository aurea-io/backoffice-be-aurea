import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'] as string | undefined;
    if (!tenantId || request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return true;
    const subscription = await this.prisma.subscription.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' }, select: { status: true, currentPeriodEnd: true, gracePeriodEndsAt: true } });
    if (!subscription) return true;
    const now = Date.now();
    const withinGrace = subscription.gracePeriodEndsAt && subscription.gracePeriodEndsAt.getTime() >= now;
    const expired = subscription.currentPeriodEnd && subscription.currentPeriodEnd.getTime() < now && !withinGrace;
    if (subscription.status === 'past_due' || subscription.status === 'canceled' || subscription.status === 'expired' || expired) {
      throw new ForbiddenException({ code: 'SUBSCRIPTION_READ_ONLY', message: 'La suscripción requiere atención antes de realizar cambios.' });
    }
    return true;
  }
}

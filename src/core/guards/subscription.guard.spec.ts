import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { SubscriptionGuard } from './subscription.guard.js';

describe('SubscriptionGuard', () => {
  let guard: SubscriptionGuard;
  let reflector: Reflector;
  let prisma: any;
  beforeEach(() => { reflector = new Reflector(); prisma = { subscription: { findFirst: vi.fn() } }; guard = new SubscriptionGuard(reflector, prisma); });
  const context = (method: string, tenantId = 't1') => { reflector.getAllAndOverride = () => false as any; return { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({ method, headers: { 'x-tenant-id': tenantId } }) }) } as any; };
  it('allows reads for an overdue subscription', async () => { prisma.subscription.findFirst.mockResolvedValue({ status: 'past_due', currentPeriodEnd: null, gracePeriodEndsAt: null }); expect(await guard.canActivate(context('GET'))).toBe(true); expect(prisma.subscription.findFirst).not.toHaveBeenCalled(); });
  it('blocks mutations for an overdue subscription', async () => { prisma.subscription.findFirst.mockResolvedValue({ status: 'past_due', currentPeriodEnd: null, gracePeriodEndsAt: null }); await expect(guard.canActivate(context('POST'))).rejects.toThrow(ForbiddenException); });
  it('allows mutations without a configured subscription', async () => { prisma.subscription.findFirst.mockResolvedValue(null); expect(await guard.canActivate(context('POST'))).toBe(true); });
});

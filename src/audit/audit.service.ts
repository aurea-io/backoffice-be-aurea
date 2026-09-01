import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AuditRecord {
  tenantId: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string;
  requestId?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditRecord) {
    return this.prisma.auditEvent.create({ data: event });
  }

  async listForTenant(tenantId: string, limit = 100) {
    return this.prisma.auditEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 500),
      select: {
        id: true, tenantId: true, actorUserId: true, action: true,
        entityType: true, entityId: true, before: true, after: true,
        reason: true, requestId: true, createdAt: true,
      },
    });
  }
}

import { describe, expect, it, vi } from 'vitest';
import { InvitationsService } from './invitations.service.js';

describe('InvitationsService', () => {
  it('allows internal global reads without a tenant context', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new InvitationsService({ invitation: { findMany } } as any);

    await expect(service.findAll(undefined, undefined, true)).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { createdAt: 'desc' },
    });
  });

  it('keeps tenant context required for external reads', async () => {
    const service = new InvitationsService({ invitation: { findMany: vi.fn() } } as any);

    await expect(service.findAll()).rejects.toThrow('An authenticated tenant context is required.');
  });
});

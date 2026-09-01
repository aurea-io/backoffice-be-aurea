import { describe, expect, it } from 'vitest';
import { hasPermissions } from './permissions.js';

describe('hasPermissions', () => {
  it('accepts the all-permissions sentinel', () => {
    expect(hasPermissions(['*'], ['catalog:write'])).toBe(true);
  });

  it('requires every permission', () => {
    expect(hasPermissions(['catalog:read'], ['catalog:read', 'catalog:write'])).toBe(false);
  });

  it('does not accept permissions from another tenant context', () => {
    expect(hasPermissions([], ['tenant:employees:manage'])).toBe(false);
  });
});

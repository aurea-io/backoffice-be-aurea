import { describe, expect, it } from 'vitest';
import { validateBranding } from './branding.validator.js';

describe('validateBranding', () => {
  it('accepts token colors, allowed fonts and HTTPS assets', () => {
    expect(validateBranding({
      primaryColor: '#7c3aed',
      accentColor: '#a78bfa',
      textColor: '#18181b',
      fontFamily: 'sans',
      logoUrl: 'https://cdn.example.com/logo.svg',
    })).toMatchObject({ fontFamily: 'sans' });
  });

  it('rejects arbitrary CSS colors and scripts in URLs', () => {
    expect(() => validateBranding({ primaryColor: 'red' })).toThrow();
    expect(() => validateBranding({ logoUrl: 'javascript:alert(1)' })).toThrow();
  });

  it('rejects fonts outside the supported allowlist', () => {
    expect(() => validateBranding({ fontFamily: 'Comic Sans' })).toThrow();
  });
});

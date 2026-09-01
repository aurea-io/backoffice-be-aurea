export const ALLOWED_BRANDING_FONTS = ['sans', 'serif', 'modern'] as const;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const SAFE_URL_PATTERN = /^https:\/\/[^\s"'<>]+$/i;

export interface BrandingInput {
  primaryColor?: string;
  accentColor?: string;
  textColor?: string;
  fontFamily?: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  layoutTokens?: Record<string, unknown> | null;
  overrides?: Record<string, unknown> | null;
}

export function validateBranding(input: BrandingInput): BrandingInput {
  for (const key of ['primaryColor', 'accentColor', 'textColor'] as const) {
    if (input[key] !== undefined && !COLOR_PATTERN.test(input[key]!)) {
      throw new Error(`${key} must be a six-digit hexadecimal color`);
    }
  }

  if (input.fontFamily !== undefined && !ALLOWED_BRANDING_FONTS.includes(input.fontFamily as any)) {
    throw new Error('fontFamily is not an allowed branding font');
  }

  for (const key of ['logoUrl', 'coverUrl'] as const) {
    if (input[key] !== undefined && input[key] !== null && !SAFE_URL_PATTERN.test(input[key]!)) {
      throw new Error(`${key} must be an HTTPS URL`);
    }
  }

  return input;
}

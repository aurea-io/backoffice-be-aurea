import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const DEFAULT_THEME = {
  primaryColor: '#7c3aed',
  accentColor: '#a78bfa',
  textColor: '#18181b',
  fontFamily: 'sans',
};

@Injectable()
export class ThemeService {
  constructor(private readonly prisma: PrismaService) {}

  async renderPublishedCss(publicId: string): Promise<{ css: string; version: number }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: publicId.trim().toLowerCase() },
      include: {
        brandingVersions: {
          where: { isPublished: true },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!tenant || !tenant.isActive) throw new NotFoundException('Theme not found.');

    const branding = { ...DEFAULT_THEME, ...(tenant.brandingVersions[0] ?? {}) };
    const version = tenant.brandingVersions[0]?.version ?? 0;
    const css = [
      ':root {',
      `  --aurea-primary: ${branding.primaryColor};`,
      `  --aurea-accent: ${branding.accentColor};`,
      `  --aurea-text: ${branding.textColor};`,
      `  --aurea-font-family: ${branding.fontFamily};`,
      `  --aurea-tenant: "${tenant.slug}";`,
      '}',
      '',
    ].join('\\n');

    return { css, version };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const DEFAULT_THEME = {
  primaryColor: '#7c3aed',
  accentColor: '#a78bfa',
  textColor: '#18181b',
  fontFamily: 'sans',
};
const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 500;

type ThemeResult = { css: string; version: number; etag: string };
type CacheEntry = ThemeResult & { expiresAt: number };

@Injectable()
export class ThemeService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<ThemeResult>>();
  private hits = 0;
  private misses = 0;

  constructor(private readonly prisma: PrismaService) {}

  async renderPublishedCss(publicId: string): Promise<ThemeResult> {
    const key = publicId.trim().toLowerCase();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      this.hits++;
      return cached;
    }

    this.misses++;
    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const load = this.loadTheme(key);
    this.inFlight.set(key, load);
    try {
      const result = await load;
      this.cache.set(key, { ...result, expiresAt: Date.now() + CACHE_TTL_MS });
      this.trimCache();
      return result;
    } catch (error) {
      const stale = this.cache.get(key);
      if (stale) return stale;
      throw error;
    } finally {
      this.inFlight.delete(key);
    }
  }

  getMetrics() {
    return { hits: this.hits, misses: this.misses, entries: this.cache.size };
  }

  private async loadTheme(publicId: string): Promise<ThemeResult> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: publicId },
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
    return {
      css: [
        ':root {',
        `  --aurea-primary: ${branding.primaryColor};`,
        `  --aurea-accent: ${branding.accentColor};`,
        `  --aurea-text: ${branding.textColor};`,
        `  --aurea-font-family: ${branding.fontFamily};`,
        `  --aurea-tenant: "${tenant.slug}";`,
        '}',
        '',
      ].join('\\n'),
      version,
      etag: `"${publicId}-${version}"`,
    };
  }

  private trimCache() {
    while (this.cache.size > MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
  }
}

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const CANONICAL_SECTIONS: Record<string, string[]> = {
  commerce: ['catalog', 'orders', 'inventory', 'pos'],
  services: ['bookings'],
  gastronomy: ['tables', 'kitchen', 'public'],
  crm: ['clients'],
  marketing: ['coupons', 'loyalty'],
  core: ['dashboard', 'members', 'theme', 'billing'],
};

describe('Architecture & Isomorphism Contract (Section -> Page -> Module)', () => {
  const sectionsDir = path.resolve(__dirname);

  it('only allows canonical section directories', () => {
    const entries = fs.readdirSync(sectionsDir, { withFileTypes: true });
    const dirNames = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name);

    for (const dir of dirNames) {
      const isValidSection = Boolean(CANONICAL_SECTIONS[dir]);
      expect(
        isValidSection,
        `Directorio ilegal '${dir}' en sections/. Solo se permiten secciones canónicas registradas en structure.json.`
      ).toBe(true);
    }
  });

  it('only allows canonical pages inside each section directory', () => {
    for (const [section, allowedPages] of Object.entries(CANONICAL_SECTIONS)) {
      const sectionPath = path.join(sectionsDir, section);
      if (!fs.existsSync(sectionPath)) continue;

      const entries = fs.readdirSync(sectionPath, { withFileTypes: true });
      const subDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.') && !['dto', 'contracts', 'manifests'].includes(e.name)).map((e) => e.name);

      for (const subDir of subDirs) {
        expect(
          allowedPages.includes(subDir),
          `Página ilegal '${subDir}' dentro de la sección '${section}'. Páginas permitidas: ${allowedPages.join(', ')}`
        ).toBe(true);
      }
    }
  });

  it('enforces @FeatureDomain isomorphism in all controllers within canonical sections', () => {
    const domainRegex = /@FeatureDomain\s*\(\s*['"]([^'"]+)['"]\s*\)/;

    function scanControllers(dir: string, sectionName?: string, pageName?: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          if (!sectionName && CANONICAL_SECTIONS[entry.name]) {
            scanControllers(fullPath, entry.name, undefined);
          } else if (sectionName && !pageName) {
            scanControllers(fullPath, sectionName, entry.name);
          } else {
            scanControllers(fullPath, sectionName, pageName);
          }
        } else if (entry.isFile() && entry.name.endsWith('.controller.ts') && sectionName && pageName) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const match = domainRegex.exec(content);
          if (match) {
            const domain = match[1];
            const validDomains = new Set([
              `${sectionName}.${pageName}`,
              pageName,
              `public.${pageName}`,
              `${sectionName}.${pageName}.public`,
            ]);
            const isValid = validDomains.has(domain) || domain.startsWith(`${sectionName}.${pageName}.`);
            expect(
              isValid,
              `Isomorfismo roto en '${entry.name}' (${sectionName}/${pageName}): declara @FeatureDomain('${domain}'). Debe coincidir con '${sectionName}.${pageName}' o '${pageName}'.`
            ).toBe(true);
          }
        }
      }
    }

    scanControllers(sectionsDir);
  });
});

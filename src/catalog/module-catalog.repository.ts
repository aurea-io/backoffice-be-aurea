import { Injectable } from '@nestjs/common';
import type { CatalogContract, CatalogModuleContract } from './contracts/index.js';
import { validateCatalogContract } from './contracts/index.js';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service.js';

export interface ModuleCatalogEntryInput {
  key: string;
  kind: 'module' | 'function';
  moduleKey: string;
  sectionKey: string;
  pageKey: string;
  label: string;
  status: string;
  requiredRole?: string;
  permissions: string[];
  dependencies: string[];
  compatibility: Prisma.InputJsonObject;
  catalogVersion: string;
}

export function catalogEntries(contract: CatalogContract): ModuleCatalogEntryInput[] {
  const validated = validateCatalogContract(contract);
  return validated.modules.flatMap((module) => [
    toModuleEntry(module, validated.version),
    ...module.functions.map((fn) => ({
      key: fn.key,
      kind: 'function' as const,
      moduleKey: module.key,
      sectionKey: module.section,
      pageKey: module.page,
      label: fn.label,
      status: fn.status,
      requiredRole: fn.requiredRole,
      permissions: fn.permissions ?? [],
      dependencies: fn.dependencies ?? [],
      compatibility: fn.compatibility as Prisma.InputJsonObject,
      catalogVersion: validated.version,
    })),
  ]);
}

function toModuleEntry(module: CatalogModuleContract, version: string): ModuleCatalogEntryInput {
  return {
    key: module.key,
    kind: 'module',
    moduleKey: module.key,
    sectionKey: module.section,
    pageKey: module.page,
    label: module.label,
    status: module.status,
    requiredRole: module.requiredRole,
    permissions: [],
    dependencies: module.dependencies ?? [],
    compatibility: module.compatibility as Prisma.InputJsonObject,
    catalogVersion: version,
  };
}

@Injectable()
export class ModuleCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async sync(contract: CatalogContract) {
    const entries = catalogEntries(contract);
    for (const entry of entries) {
      await this.prisma.moduleCatalogEntry.upsert({
        where: { key: entry.key },
        create: entry,
        update: entry,
      });
    }
    return entries;
  }

  findTree() {
    return this.prisma.moduleCatalogEntry.findMany({
      orderBy: [{ sectionKey: 'asc' }, { pageKey: 'asc' }, { kind: 'asc' }, { key: 'asc' }],
    });
  }
}

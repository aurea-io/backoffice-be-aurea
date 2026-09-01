import { Injectable } from '@nestjs/common';
import type { CatalogContract, CatalogModuleContract } from './contracts/index.js';
import { validateCatalogContract } from './contracts/index.js';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ModuleCatalogEntryInput {
  key: string;
  kind: 'module' | 'function';
  moduleKey: string;
  sectionKey: string;
  pageKey: string;
  scope: string;
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
      scope: fn.scope,
      label: fn.label,
      status: fn.status,
      requiredRole: fn.requiredRole,
      permissions: fn.permissions ?? [],
      dependencies: fn.dependencies ?? [],
      compatibility: fn.compatibility as unknown as Prisma.InputJsonObject,
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
    scope: module.scope,
    label: module.label,
    status: module.status,
    requiredRole: module.requiredRole,
    permissions: [],
    dependencies: module.dependencies ?? [],
    compatibility: module.compatibility as unknown as Prisma.InputJsonObject,
    catalogVersion: version,
  };
}

@Injectable()
export class ModuleCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async sync(contract: CatalogContract) {
    const entries = catalogEntries(contract);
    const keys = entries.map((entry) => entry.key);
    await this.prisma.$transaction([
      this.prisma.moduleCatalogEntry.updateMany({
        where: { key: { notIn: keys } },
        data: { isArchived: true, catalogVersion: contract.version },
      }),
      ...entries.map((entry) => this.prisma.moduleCatalogEntry.upsert({
        where: { key: entry.key },
        create: { ...entry, isArchived: false, requiredRole: entry.requiredRole ?? null },
        update: { ...entry, isArchived: false, requiredRole: entry.requiredRole ?? null },
      })),
    ]);
    return entries;
  }

  findTree() {
    return this.prisma.moduleCatalogEntry.findMany({
      where: { isArchived: false },
      orderBy: [{ sectionKey: 'asc' }, { pageKey: 'asc' }, { kind: 'asc' }, { key: 'asc' }],
    });
  }
}

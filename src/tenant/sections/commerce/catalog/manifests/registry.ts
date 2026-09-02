import type {
  CatalogContract,
  CatalogModuleContract,
} from '../contracts/catalog-contract.js';
import { validateCatalogContract } from '../contracts/catalog-contract.validator.js';

/** Defines a domain manifest without allowing an unvalidated object into the registry. */
export function defineCatalogManifest(
  manifest: CatalogModuleContract,
): CatalogModuleContract {
  validateCatalogContract({ version: '1.0.0', modules: [manifest] });
  return manifest;
}

/** Combines domain manifests into the single snapshot consumed by API and sync jobs. */
export function buildCatalogContract(
  manifests: readonly CatalogModuleContract[],
  version = '1.0.0',
): CatalogContract {
  return validateCatalogContract({ version, modules: [...manifests] });
}

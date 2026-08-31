import { Global, Module } from '@nestjs/common';
import { UserRepository } from './user.repository.js';
import { TenantRepository } from './tenant.repository.js';
import { AuthTokenRepository } from './auth-token.repository.js';
import { CatalogRepository } from './catalog.repository.js';

@Global()
@Module({
  providers: [
    UserRepository,
    TenantRepository,
    AuthTokenRepository,
    CatalogRepository,
  ],
  exports: [
    UserRepository,
    TenantRepository,
    AuthTokenRepository,
    CatalogRepository,
  ],
})
export class RepositoriesModule {}

export class AuthConstants {
  static readonly BCRYPT_ROUNDS = 10;
  static readonly REFRESH_TOKEN_BYTES = 48;
  static readonly OPAQUE_TOKEN_BYTES = 32;
  static readonly MAGIC_LINK_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes
  static readonly PASSWORD_RESET_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes
  static readonly REFRESH_COOKIE_NAME = 'aurea_refresh_token';
  static readonly DEFAULT_JWT_ACCESS_EXPIRATION = '15m';
  static readonly DEFAULT_JWT_REFRESH_EXPIRATION = '7d';
  static readonly DUMMY_PASSWORD_HASH =
    '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ012345';

  static readonly USER_SAFE_SELECT = {
    id: true,
    email: true,
    name: true,
    avatarUrl: true,
    preferences: true,
    active: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}

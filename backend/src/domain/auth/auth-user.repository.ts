import { UserRole } from './user-role.enum';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  /** Hash del refresh token vigente; null si no tiene sesión activa. */
  refreshTokenHash: string | null;
  role: UserRole;
}

/**
 * Puerto del dominio: la aplicación depende de esta interfaz para leer/
 * actualizar credenciales de usuarios, nunca de una implementación concreta
 * (TypeORM, etc.).
 */
export const AUTH_USER_REPOSITORY = Symbol('AUTH_USER_REPOSITORY');

export interface AuthUserRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  setRefreshTokenHash(userId: string, hash: string | null): Promise<void>;
}

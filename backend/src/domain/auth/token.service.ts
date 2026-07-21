import { UserRole } from './user-role.enum';

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Puerto del dominio para emitir/verificar tokens. La implementación real
 * (JWT firmado, secretos, expiraciones) vive en infraestructura.
 */
export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface TokenService {
  generateTokens(payload: TokenPayload): Promise<AuthTokens>;
  /** Verifica el refresh token y devuelve su payload. Si es inválido o expiró, rechaza. */
  verifyRefreshToken(refreshToken: string): Promise<TokenPayload>;
}

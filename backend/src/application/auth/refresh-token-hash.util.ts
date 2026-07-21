import { createHash, timingSafeEqual } from 'crypto';

/**
 * bcrypt trunca cualquier input a 72 bytes. Los refresh tokens (JWT) son más
 * largos que eso y, entre sí, comparten un prefijo casi idéntico (mismo
 * header y mismas claims iniciales; solo cambian iat/exp/firma al final), así
 * que bcrypt-hashear tokens distintos podía producir el mismo hash y romper
 * la invalidación al rotar. Por eso acá se usa SHA-256 en vez de bcrypt: el
 * refresh token ya es opaco/aleatorio (no es una contraseña de baja entropía
 * elegida por un humano), así que no hace falta el hash lento+salado de
 * bcrypt, y SHA-256 no trunca el input.
 */
export function hashRefreshToken(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

export function refreshTokenMatches(
  refreshToken: string,
  storedHash: string,
): boolean {
  const candidate = Buffer.from(hashRefreshToken(refreshToken));
  const stored = Buffer.from(storedHash);
  return (
    candidate.length === stored.length && timingSafeEqual(candidate, stored)
  );
}

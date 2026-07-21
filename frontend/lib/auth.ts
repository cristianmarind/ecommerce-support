export type UserRole = 'admin' | 'user';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  exp: number;
}

/** Emails de los usuarios demo sembrados por el backend (ver AddAuthCredentials). */
export const DEMO_EMAILS = [
  'cliente.demo@imagineapps.test',
  'admin.demo@imagineapps.test',
];

const ACCESS_TOKEN_KEY = 'imagineapps.accessToken';
const REFRESH_TOKEN_KEY = 'imagineapps.refreshToken';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Decodifica el payload de un JWT sin verificar la firma — solo para leer
 * claims en el cliente (la verificación real ya la hizo el backend al
 * emitirlo/validarlo). */
function decodeAccessToken(token: string): AccessTokenPayload | null {
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function storeTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function sessionFromAccessToken(accessToken: string): SessionUser | null {
  const payload = decodeAccessToken(accessToken);
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  };
}

export async function login(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;

  const { accessToken, refreshToken } = await res.json();
  storeTokens(accessToken, refreshToken);
  return sessionFromAccessToken(accessToken);
}

export async function logout(): Promise<void> {
  const accessToken = getAccessToken();
  if (accessToken) {
    // Best-effort: si el request falla (token ya vencido, red caída), igual
    // se limpia la sesión local.
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => undefined);
  }
  clearSession();
}

/** Sesión actual a partir del access token guardado, o null si no hay uno
 * vigente (ausente o vencido). No intenta renovar — ver refreshAccessToken. */
export function getSession(): SessionUser | null {
  const accessToken = getAccessToken();
  if (!accessToken) return null;

  const payload = decodeAccessToken(accessToken);
  if (!payload || payload.exp * 1000 < Date.now()) return null;

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  };
}

/**
 * Intenta renovar el access token con el refresh token guardado. Devuelve el
 * nuevo access token si funcionó, o null si el refresh token no existe, venció
 * o ya fue revocado (logout/rotación previa) — en ese caso no toca el storage,
 * así que el caller decide si redirigir a /login.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;

  const tokens = await res.json();
  storeTokens(tokens.accessToken, tokens.refreshToken);
  return tokens.accessToken;
}

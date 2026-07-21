export type UserRole = 'cliente' | 'admin';

interface DemoUser {
  email: string;
  password: string;
  role: UserRole;
  name: string;
}

/**
 * Usuarios quemados para el login de demo. Corresponden a los usuarios
 * sembrados por la migración inicial del backend (ver seeded-users.ts en el
 * backend) — el backend igual no valida esta sesión todavía (usa sus propios
 * guards/decoradores quemados), así que este login es solo de UX por ahora.
 */
const DEMO_USERS: DemoUser[] = [
  {
    email: 'cliente.demo@imagineapps.test',
    password: 'password',
    role: 'cliente',
    name: 'Cliente Demo',
  },
  {
    email: 'admin.demo@imagineapps.test',
    password: 'password',
    role: 'admin',
    name: 'Admin Demo',
  },
];

export const DEMO_EMAILS = DEMO_USERS.map((user) => user.email);

export interface SessionUser {
  email: string;
  role: UserRole;
  name: string;
}

const STORAGE_KEY = 'imagineapps.session';

export function login(email: string, password: string): SessionUser | null {
  const found = DEMO_USERS.find(
    (user) => user.email === email && user.password === password,
  );
  if (!found) return null;

  const session: SessionUser = {
    email: found.email,
    role: found.role,
    name: found.name,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, refreshAccessToken, SessionUser, UserRole } from './auth';

/**
 * Protege una página cliente: si no hay sesión o el rol no coincide,
 * redirige a /login. Retorna null mientras valida o si redirige.
 *
 * El access token dura poco (15m); si al entrar a la página ya venció, se
 * intenta renovar una vez con el refresh token antes de mandar a /login.
 */
export function useAuthGuard(requiredRole: UserRole): SessionUser | null {
  const router = useRouter();
  const [session, setSession] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveSession() {
      let current = getSession();

      if (!current) {
        const renewed = await refreshAccessToken();
        if (renewed) current = getSession();
      }

      if (cancelled) return;

      if (!current || current.role !== requiredRole) {
        router.replace('/login');
        return;
      }
      setSession(current);
    }

    resolveSession();
    return () => {
      cancelled = true;
    };
  }, [requiredRole, router]);

  return session;
}

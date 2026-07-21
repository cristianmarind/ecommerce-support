'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, SessionUser, UserRole } from './auth';

/**
 * Protege una página cliente: si no hay sesión o el rol no coincide,
 * redirige a /login. Retorna null mientras valida o si redirige.
 */
export function useAuthGuard(requiredRole: UserRole): SessionUser | null {
  const router = useRouter();
  const [session, setSession] = useState<SessionUser | null>(null);

  useEffect(() => {
    const current = getSession();
    if (!current || current.role !== requiredRole) {
      router.replace('/login');
      return;
    }
    setSession(current);
  }, [requiredRole, router]);

  return session;
}

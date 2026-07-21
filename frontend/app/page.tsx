'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getSession, refreshAccessToken } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      let session = getSession();
      if (!session) {
        const renewed = await refreshAccessToken();
        if (renewed) session = getSession();
      }

      if (!session) {
        router.replace('/login');
        return;
      }
      router.replace(session.role === 'admin' ? '/admin' : '/cliente');
    }

    redirect();
  }, [router]);

  return null;
}

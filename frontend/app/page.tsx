'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getSession } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    router.replace(session.role === 'admin' ? '/admin' : '/cliente');
  }, [router]);

  return null;
}

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CustomerTicketsList } from '@/components/CustomerTicketsList';
import { TicketForm } from '@/components/TicketForm';
import { getMyTickets, PaginatedTickets, Ticket } from '@/lib/api';
import { logout } from '@/lib/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';

const PAGE_SIZE = 5;

export default function ClientePage() {
  const session = useAuthGuard('user');
  const router = useRouter();

  const [data, setData] = useState<PaginatedTickets | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyTickets = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    try {
      const result = await getMyTickets(targetPage, PAGE_SIZE);
      setData(result);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchMyTickets(page);
  }, [session, page, fetchMyTickets]);

  if (!session) {
    return null;
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  function handleCreated(ticket: Ticket) {
    router.push(`/cliente/${ticket.id}`);
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Hola, {session.name}</h1>
          <p className="text-sm text-slate-500">
            Cuéntanos tu problema. Nuestro equipo de soporte te responderá a la
            brevedad.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="whitespace-nowrap text-sm text-slate-500 underline hover:text-slate-700"
        >
          Cerrar sesión
        </button>
      </div>

      <TicketForm onCreated={handleCreated} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Mis casos</h2>
        <CustomerTicketsList data={data} isLoading={isLoading} onPageChange={setPage} />
      </div>
    </main>
  );
}

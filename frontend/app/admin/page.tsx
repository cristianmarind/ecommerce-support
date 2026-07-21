'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AdminTicketsTable } from '@/components/AdminTicketsTable';
import { getTickets, PaginatedTickets, Ticket, updateTicketStatus } from '@/lib/api';
import { logout } from '@/lib/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';

const PAGE_SIZE = 5;

export default function AdminPage() {
  const session = useAuthGuard('admin');
  const router = useRouter();

  const [data, setData] = useState<PaginatedTickets | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    try {
      const result = await getTickets(targetPage, PAGE_SIZE);
      setData(result);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchTickets(page);
  }, [session, page, fetchTickets]);

  if (!session) {
    return null;
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  async function handleStatusChange(ticket: Ticket, status: Ticket['status']) {
    setError(null);
    setUpdatingTicketId(ticket.id);
    try {
      await updateTicketStatus(ticket.id, status);
      await fetchTickets(page);
    } catch {
      setError('No se pudo actualizar el ticket. Intenta de nuevo.');
    } finally {
      setUpdatingTicketId(null);
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Panel de soporte</h1>
          <p className="text-sm text-slate-500">
            Hola, {session.name}. Tickets creados por los clientes, categorizados por IA.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="whitespace-nowrap text-sm text-slate-500 underline hover:text-slate-700"
        >
          Cerrar sesión
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <AdminTicketsTable
        data={data}
        isLoading={isLoading}
        updatingTicketId={updatingTicketId}
        onPageChange={setPage}
        onCloseTicket={(ticket) => handleStatusChange(ticket, 'RESUELTO_AGENTE')}
        onReassignTicket={(ticket) => handleStatusChange(ticket, 'PENDIENTE_AGENTE')}
      />
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { MessageThread } from '@/components/MessageThread';
import { SendMessageForm } from '@/components/SendMessageForm';
import {
  getTicketDetail,
  sendAgentMessage,
  Ticket,
  TicketStatus,
  updateTicketStatus,
} from '@/lib/api';
import { categoryLabels, statusColors, statusLabels } from '@/lib/labels';
import { useAuthGuard } from '@/lib/use-auth-guard';

export default function AdminTicketDetailPage() {
  const session = useAuthGuard('admin');
  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getTicketDetail(ticketId);
      setTicket(result);
      setError(null);
    } catch {
      setError('No se pudo cargar el caso.');
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!session) return;
    fetchTicket();
  }, [session, fetchTicket]);

  if (!session) {
    return null;
  }

  async function handleSend(content: string) {
    await sendAgentMessage(ticketId, content);
    await fetchTicket();
  }

  async function handleStatusChange(status: TicketStatus) {
    setIsUpdating(true);
    try {
      await updateTicketStatus(ticketId, status);
      await fetchTicket();
    } catch {
      setError('No se pudo actualizar el ticket. Intenta de nuevo.');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <Link href="/admin" className="text-sm text-slate-500 underline hover:text-slate-700">
        ← Volver al panel
      </Link>

      {isLoading && !ticket && <p className="text-sm text-slate-500">Cargando caso...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {ticket && (
        <>
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[ticket.status]}`}
              >
                {statusLabels[ticket.status]}
              </span>
              <span className="text-xs text-slate-500">{categoryLabels[ticket.category]}</span>
            </div>
            <p className="text-sm text-slate-800">{ticket.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {ticket.status === 'RESOLVIENDO_IA' && (
              <button
                onClick={() => handleStatusChange('RESUELTO_IA')}
                disabled={isUpdating}
                className="rounded-md border border-sky-300 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmar resolución IA
              </button>
            )}
            <button
              onClick={() => handleStatusChange('RESUELTO_AGENTE')}
              disabled={isUpdating}
              className="rounded-md border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cerrar Ticket
            </button>
            <button
              onClick={() => handleStatusChange('PENDIENTE_AGENTE')}
              disabled={isUpdating}
              className="rounded-md border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reasignar a Humano
            </button>
          </div>

          <MessageThread messages={ticket.messages} viewerRole="admin" showAiDetails />
          <SendMessageForm onSend={handleSend} />
        </>
      )}
    </main>
  );
}

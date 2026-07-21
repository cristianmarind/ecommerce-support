'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { MessageThread } from '@/components/MessageThread';
import { SendMessageForm } from '@/components/SendMessageForm';
import { getMyTicketDetail, Ticket } from '@/lib/api';
import { categoryLabels, customerStatusLabels, statusColors } from '@/lib/labels';
import { useAuthGuard } from '@/lib/use-auth-guard';

export default function ClienteTicketDetailPage() {
  const session = useAuthGuard('user');
  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getMyTicketDetail(ticketId);
      setTicket(result);
      setError(null);
    } catch {
      setError('No se pudo cargar el caso. Puede que no exista o no sea tuyo.');
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

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <Link href="/cliente" className="text-sm text-slate-500 underline hover:text-slate-700">
        ← Volver a mis casos
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
                {customerStatusLabels[ticket.status]}
              </span>
              <span className="text-xs text-slate-500">{categoryLabels[ticket.category]}</span>
            </div>
            <p className="text-sm text-slate-800">{ticket.description}</p>
          </div>

          <MessageThread messages={ticket.messages} viewerRole="user" />
          <SendMessageForm disabledMessage="Enviar mensajes no está disponible en esta demo." />
        </>
      )}
    </main>
  );
}

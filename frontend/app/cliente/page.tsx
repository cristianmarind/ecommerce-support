'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TicketForm } from '@/components/TicketForm';
import { Ticket } from '@/lib/api';
import { logout } from '@/lib/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';

export default function ClientePage() {
  const session = useAuthGuard('cliente');
  const router = useRouter();
  const [lastTicket, setLastTicket] = useState<Ticket | null>(null);

  if (!session) {
    return null;
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const aiMessage = lastTicket?.messages.find((m) => m.senderType === 'IA');

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Hola, {session.name}</h1>
          <p className="text-sm text-slate-500">
            Cuéntanos tu problema. La IA intentará resolverlo automáticamente; si no
            puede, un agente humano lo atenderá.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="whitespace-nowrap text-sm text-slate-500 underline hover:text-slate-700"
        >
          Cerrar sesión
        </button>
      </div>

      <TicketForm onCreated={setLastTicket} />

      {lastTicket && (
        <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">
            {lastTicket.status === 'RESOLVIENDO_IA'
              ? 'Respuesta de la IA:'
              : 'Ticket creado:'}
          </p>
          <p className="text-sm text-emerald-800">
            {aiMessage?.content ?? 'Un agente revisará tu caso pronto.'}
          </p>
        </div>
      )}
    </main>
  );
}

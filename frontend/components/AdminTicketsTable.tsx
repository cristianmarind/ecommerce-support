import { Ticket } from '@/lib/api';
import { categoryLabels, statusColors, statusLabels } from '@/lib/labels';

interface AdminTicketsTableProps {
  data: { items: Ticket[]; page: number; total: number; totalPages: number } | null;
  isLoading: boolean;
  updatingTicketId: string | null;
  onPageChange: (page: number) => void;
  onCloseTicket: (ticket: Ticket) => void;
  onReassignTicket: (ticket: Ticket) => void;
}

export function AdminTicketsTable({
  data,
  isLoading,
  updatingTicketId,
  onPageChange,
  onCloseTicket,
  onReassignTicket,
}: AdminTicketsTableProps) {
  if (isLoading && !data) {
    return <p className="text-sm text-slate-500">Cargando tickets...</p>;
  }

  if (!data || data.items.length === 0) {
    return <p className="text-sm text-slate-500">Aún no hay tickets registrados.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Categoría (IA)</th>
              <th className="px-4 py-3">Confianza</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((ticket) => {
              const aiMessage = ticket.messages.find((m) => m.senderType === 'IA');
              const isUpdating = updatingTicketId === ticket.id;

              return (
                <tr key={ticket.id}>
                  <td className="max-w-xs px-4 py-3 text-slate-800">{ticket.description}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[ticket.status]}`}
                    >
                      {statusLabels[ticket.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{categoryLabels[ticket.category]}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {aiMessage?.confidenceScore !== undefined && aiMessage?.confidenceScore !== null
                      ? `${Math.round(aiMessage.confidenceScore * 100)}%`
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => onCloseTicket(ticket)}
                        disabled={isUpdating}
                        className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cerrar Ticket
                      </button>
                      <button
                        onClick={() => onReassignTicket(ticket)}
                        disabled={isUpdating}
                        className="rounded-md border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reasignar a Humano
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Página {data.page} de {data.totalPages || 1} ({data.total} tickets)
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(data.page - 1)}
            disabled={data.page <= 1}
            className="rounded-md border border-slate-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            onClick={() => onPageChange(data.page + 1)}
            disabled={data.page >= data.totalPages}
            className="rounded-md border border-slate-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

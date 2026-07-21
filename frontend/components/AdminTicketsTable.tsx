import Link from 'next/link';
import { Ticket } from '@/lib/api';
import { categoryLabels, statusColors, statusLabels } from '@/lib/labels';

interface AdminTicketsTableProps {
  data: { items: Ticket[]; page: number; total: number; totalPages: number } | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export function AdminTicketsTable({
  data,
  isLoading,
  onPageChange,
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
                    <Link
                      href={`/admin/${ticket.id}`}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Ver detalle
                    </Link>
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

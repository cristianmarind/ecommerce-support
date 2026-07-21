import { PaginatedTickets } from '@/lib/api';
import { categoryLabels, statusLabels } from '@/lib/labels';

interface TicketsTableProps {
  data: PaginatedTickets | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export function TicketsTable({ data, isLoading, onPageChange }: TicketsTableProps) {
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
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Respuesta sugerida</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((ticket) => (
              <tr key={ticket.id}>
                <td className="max-w-xs px-4 py-3 text-slate-800">{ticket.description}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      ticket.status === 'RESUELTO_IA'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {statusLabels[ticket.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{categoryLabels[ticket.category]}</td>
                <td className="max-w-sm px-4 py-3 text-slate-600">{ticket.suggestedResponse}</td>
              </tr>
            ))}
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

import Link from 'next/link';
import { PaginatedTickets } from '@/lib/api';
import { categoryLabels, statusColors, statusLabels } from '@/lib/labels';

interface CustomerTicketsListProps {
  data: PaginatedTickets | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export function CustomerTicketsList({
  data,
  isLoading,
  onPageChange,
}: CustomerTicketsListProps) {
  if (isLoading && !data) {
    return <p className="text-sm text-slate-500">Cargando tus casos...</p>;
  }

  if (!data || data.items.length === 0) {
    return <p className="text-sm text-slate-500">Todavía no creaste ningún caso.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {data.items.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/cliente/${ticket.id}`}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
          >
            <div className="flex flex-col gap-1">
              <p className="max-w-md truncate text-sm text-slate-800">
                {ticket.description}
              </p>
              <span className="text-xs text-slate-500">
                {categoryLabels[ticket.category]}
              </span>
            </div>
            <span
              className={`inline-flex shrink-0 rounded-full px-2 py-1 text-xs font-medium ${statusColors[ticket.status]}`}
            >
              {statusLabels[ticket.status]}
            </span>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Página {data.page} de {data.totalPages || 1} ({data.total} casos)
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

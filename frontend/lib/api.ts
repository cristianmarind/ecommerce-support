export type TicketStatus = 'RESUELTO_IA' | 'PENDIENTE_AGENTE';

export type TicketCategory =
  | 'FACTURACION'
  | 'ENVIOS'
  | 'DEVOLUCIONES'
  | 'TECNICO'
  | 'GENERAL';

export interface Ticket {
  id: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory;
  suggestedResponse: string;
  createdAt: string;
}

export interface PaginatedTickets {
  items: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export async function createTicket(description: string): Promise<Ticket> {
  const res = await fetch(`${API_URL}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });

  if (!res.ok) {
    throw new Error('No se pudo crear el ticket');
  }

  return res.json();
}

export async function getTickets(
  page: number,
  limit: number,
): Promise<PaginatedTickets> {
  const res = await fetch(`${API_URL}/tickets?page=${page}&limit=${limit}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('No se pudo obtener la lista de tickets');
  }

  return res.json();
}

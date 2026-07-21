export type TicketStatus =
  | 'RESOLVIENDO_IA'
  | 'RESUELTO_IA'
  | 'PENDIENTE_AGENTE'
  | 'RESOLVIENDO_AGENTE'
  | 'RESUELTO_AGENTE';

export type TicketCategory =
  | 'FACTURACION'
  | 'ENVIOS'
  | 'DEVOLUCIONES'
  | 'TECNICO'
  | 'GENERAL';

export type MessageSenderType = 'CLIENTE' | 'IA' | 'AGENTE';

export interface Message {
  id: string;
  senderType: MessageSenderType;
  content: string;
  suggestedResponse: string | null;
  confidenceScore: number | null;
  createdAt: string;
}

export interface Ticket {
  id: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory;
  messages: Message[];
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

export async function sendMessage(ticketId: string, content: string): Promise<Message> {
  const res = await fetch(`${API_URL}/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    throw new Error('No se pudo enviar el mensaje');
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

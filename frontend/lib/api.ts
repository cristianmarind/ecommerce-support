import { clearSession, getAccessToken, refreshAccessToken } from './auth';

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
  /**
   * Solo vienen en las respuestas de endpoints de admin (GET /tickets,
   * PATCH /:id/status). Los endpoints de cliente (POST /tickets,
   * POST /:id/messages) nunca los incluyen — ver customer-*-response.dto.ts
   * en el backend.
   */
  suggestedResponse?: string | null;
  confidenceScore?: number | null;
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

/**
 * El backend manda mensajes de error explícitos (ej. PromptSafetyGuard
 * explicando por qué bloqueó el contenido) en el body como `message`. Sin
 * esto, el frontend mostraba un texto genérico y el usuario nunca se
 * enteraba del motivo real (ej. que su mensaje fue rechazado por seguridad).
 */
async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.message === 'string') return body.message;
  } catch {
    // Body no era JSON o vino vacío: nos quedamos con el fallback.
  }
  return fallback;
}

/**
 * fetch con el access token vigente. Si el backend responde 401 (token
 * vencido o inválido), intenta renovarlo una vez con el refresh token y
 * reintenta el request original; si la renovación también falla, limpia la
 * sesión y manda a /login.
 */
async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const doFetch = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  const res = await doFetch(getAccessToken());
  if (res.status !== 401) return res;

  const newAccessToken = await refreshAccessToken();
  if (!newAccessToken) {
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
    return res;
  }

  return doFetch(newAccessToken);
}

export async function createTicket(description: string): Promise<Ticket> {
  const res = await authFetch('/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'No se pudo crear el ticket'));
  }

  return res.json();
}

export async function sendAgentMessage(ticketId: string, content: string): Promise<Message> {
  const res = await authFetch(`/tickets/${ticketId}/agent-messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'No se pudo enviar el mensaje'));
  }

  return res.json();
}

/** Lista paginada de los tickets del cliente autenticado ("mis casos"). */
export async function getMyTickets(
  page: number,
  limit: number,
): Promise<PaginatedTickets> {
  const res = await authFetch(`/tickets/mine?page=${page}&limit=${limit}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('No se pudo obtener tus tickets');
  }

  return res.json();
}

/** Detalle de un ticket propio del cliente. */
export async function getMyTicketDetail(ticketId: string): Promise<Ticket> {
  const res = await authFetch(`/tickets/mine/${ticketId}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('No se pudo obtener el ticket');
  }

  return res.json();
}

/** Detalle de cualquier ticket, para el panel de admin. */
export async function getTicketDetail(ticketId: string): Promise<Ticket> {
  const res = await authFetch(`/tickets/${ticketId}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('No se pudo obtener el ticket');
  }

  return res.json();
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<Ticket> {
  const res = await authFetch(`/tickets/${ticketId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error('No se pudo actualizar el estado del ticket');
  }

  return res.json();
}

export async function getTickets(
  page: number,
  limit: number,
): Promise<PaginatedTickets> {
  const res = await authFetch(`/tickets?page=${page}&limit=${limit}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('No se pudo obtener la lista de tickets');
  }

  return res.json();
}

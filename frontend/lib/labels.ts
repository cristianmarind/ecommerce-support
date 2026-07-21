import { TicketCategory, TicketStatus } from './api';

export const statusLabels: Record<TicketStatus, string> = {
  RESOLVIENDO_IA: 'Resolviendo (IA)',
  RESUELTO_IA: 'Resuelto por IA',
  PENDIENTE_AGENTE: 'Pendiente agente',
  RESOLVIENDO_AGENTE: 'Resolviendo (agente)',
  RESUELTO_AGENTE: 'Resuelto por agente',
};

/** Vista del cliente: nunca debe revelar si lo resolvió la IA o un agente humano. */
export const customerStatusLabels: Record<TicketStatus, string> = {
  RESOLVIENDO_IA: 'En revisión',
  RESUELTO_IA: 'Resuelto',
  PENDIENTE_AGENTE: 'Pendiente',
  RESOLVIENDO_AGENTE: 'En revisión',
  RESUELTO_AGENTE: 'Resuelto',
};

export const statusColors: Record<TicketStatus, string> = {
  RESOLVIENDO_IA: 'bg-sky-100 text-sky-700',
  RESUELTO_IA: 'bg-emerald-100 text-emerald-700',
  PENDIENTE_AGENTE: 'bg-amber-100 text-amber-700',
  RESOLVIENDO_AGENTE: 'bg-orange-100 text-orange-700',
  RESUELTO_AGENTE: 'bg-emerald-100 text-emerald-700',
};

export const categoryLabels: Record<TicketCategory, string> = {
  FACTURACION: 'Facturación',
  ENVIOS: 'Envíos',
  DEVOLUCIONES: 'Devoluciones',
  TECNICO: 'Técnico',
  GENERAL: 'General',
};

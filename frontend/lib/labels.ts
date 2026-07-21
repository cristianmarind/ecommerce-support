import { TicketCategory, TicketStatus } from './api';

export const statusLabels: Record<TicketStatus, string> = {
  RESOLVIENDO_IA: 'Resolviendo (IA)',
  RESUELTO_IA: 'Resuelto por IA',
  PENDIENTE_AGENTE: 'Pendiente agente',
  RESOLVIENDO_AGENTE: 'Resolviendo (agente)',
  RESUELTO_AGENTE: 'Resuelto por agente',
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

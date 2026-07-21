import { TicketCategory, TicketStatus } from './api';

export const statusLabels: Record<TicketStatus, string> = {
  RESUELTO_IA: 'Resuelto por IA',
  PENDIENTE_AGENTE: 'Pendiente agente',
};

export const categoryLabels: Record<TicketCategory, string> = {
  FACTURACION: 'Facturación',
  ENVIOS: 'Envíos',
  DEVOLUCIONES: 'Devoluciones',
  TECNICO: 'Técnico',
  GENERAL: 'General',
};

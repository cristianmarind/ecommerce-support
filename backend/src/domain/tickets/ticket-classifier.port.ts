import { TicketCategory } from './ticket-category.enum';

/**
 * Puerto del dominio: la aplicación depende de esta interfaz para clasificar
 * un ticket en una categoría a partir de su descripción, nunca de una
 * implementación concreta (LangChain, el proveedor de IA, etc.).
 */
export const TICKET_CLASSIFIER_PORT = Symbol('TICKET_CLASSIFIER_PORT');

export interface TicketClassifierPort {
  classify(description: string): Promise<TicketCategory>;
}

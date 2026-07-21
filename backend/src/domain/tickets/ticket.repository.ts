import { Ticket } from './ticket.entity';
import { TicketStatus } from './ticket-status.enum';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Puerto del dominio: la capa de aplicación depende de esta interfaz,
 * nunca de una implementación concreta (en memoria, TypeORM, etc.).
 */
export const TICKET_REPOSITORY = Symbol('TICKET_REPOSITORY');

export interface TicketRepository {
  create(ticket: Ticket): Promise<Ticket>;
  findById(id: string): Promise<Ticket | null>;
  /** Si se pasa creatorId, solo trae los tickets creados por ese usuario. */
  findAll(
    page: number,
    limit: number,
    creatorId?: string,
  ): Promise<PaginatedResult<Ticket>>;
  updateStatus(
    id: string,
    status: TicketStatus,
    updaterId: string,
  ): Promise<Ticket>;
}

import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../domain/tickets/ticket.repository';
import { Ticket } from '../../../domain/tickets/ticket.entity';
import {
  TICKET_REPOSITORY,
  TicketRepository,
} from '../../../domain/tickets/ticket.repository';

@Injectable()
export class ListTicketsUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepository,
  ) {}

  /** Si se pasa creatorId, solo lista los tickets de ese usuario (vista "mis casos"). */
  execute(
    page: number,
    limit: number,
    creatorId?: string,
  ): Promise<PaginatedResult<Ticket>> {
    return this.ticketRepository.findAll(page, limit, creatorId);
  }
}

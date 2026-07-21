import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TicketCategory } from '../../../domain/tickets/ticket-category.enum';
import { Ticket } from '../../../domain/tickets/ticket.entity';
import { TicketStatus } from '../../../domain/tickets/ticket-status.enum';
import {
  TICKET_REPOSITORY,
  TicketRepository,
} from '../../../domain/tickets/ticket.repository';

@Injectable()
export class CreateTicketUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepository,
  ) {}

  async execute(description: string): Promise<Ticket> {
    // TODO: por ahora la categoría, el estado y la respuesta quedan quemados.
    // Cuando se integre IA, este caso de uso invocará el servicio de clasificación.
    const ticket = new Ticket(
      randomUUID(),
      description,
      TicketStatus.PENDING_AGENT,
      TicketCategory.GENERAL,
      'Un agente revisará tu caso y te responderá a la brevedad.',
      new Date(),
    );

    return this.ticketRepository.create(ticket);
  }
}

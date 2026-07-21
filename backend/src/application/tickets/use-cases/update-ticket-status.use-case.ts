import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Ticket } from '../../../domain/tickets/ticket.entity';
import { TicketStatus } from '../../../domain/tickets/ticket-status.enum';
import {
  TICKET_REPOSITORY,
  TicketRepository,
} from '../../../domain/tickets/ticket.repository';

@Injectable()
export class UpdateTicketStatusUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepository,
  ) {}

  async execute(
    ticketId: string,
    status: TicketStatus,
    updaterId: string,
  ): Promise<Ticket> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} no encontrado`);
    }

    return this.ticketRepository.updateStatus(ticketId, status, updaterId);
  }
}

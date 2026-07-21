import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Ticket } from '../../../domain/tickets/ticket.entity';
import {
  TICKET_REPOSITORY,
  TicketRepository,
} from '../../../domain/tickets/ticket.repository';

@Injectable()
export class GetTicketByIdUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepository,
  ) {}

  /**
   * Si se pasa requireCreatorId, valida que el ticket sea del dueño indicado
   * (vista de detalle del cliente). Si no coincide, tira NotFoundException en
   * vez de un error de permisos: no queremos revelarle a alguien que no es
   * dueño que un ticket con ese id existe.
   */
  async execute(ticketId: string, requireCreatorId?: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket || (requireCreatorId && ticket.creatorId !== requireCreatorId)) {
      throw new NotFoundException(`Ticket ${ticketId} no encontrado`);
    }

    return ticket;
  }
}

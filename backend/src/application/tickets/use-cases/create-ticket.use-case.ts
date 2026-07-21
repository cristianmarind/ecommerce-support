import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TicketCategory } from '../../../domain/tickets/ticket-category.enum';
import { Ticket } from '../../../domain/tickets/ticket.entity';
import { TicketStatus } from '../../../domain/tickets/ticket-status.enum';
import {
  TICKET_REPOSITORY,
  TicketRepository,
} from '../../../domain/tickets/ticket.repository';
import { Message } from '../../../domain/messages/message.entity';
import { MessageSenderType } from '../../../domain/messages/message-sender-type.enum';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from '../../../domain/messages/message.repository';

@Injectable()
export class CreateTicketUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: MessageRepository,
  ) {}

  async execute(description: string, creatorId: string): Promise<Ticket> {
    // TODO: por ahora la categoría, el estado y la respuesta de IA quedan quemados.
    // Cuando se integre IA real, este caso de uso invocará el servicio de clasificación.
    const now = new Date();
    const ticketId = randomUUID();

    const ticket = new Ticket(
      ticketId,
      description,
      TicketStatus.PENDING_AGENT,
      TicketCategory.GENERAL,
      [],
      now,
      now,
      creatorId,
      creatorId,
    );

    const createdTicket = await this.ticketRepository.create(ticket);

    const initialMessage = new Message(
      randomUUID(),
      ticketId,
      MessageSenderType.AI,
      'Un agente revisará tu caso y te responderá a la brevedad.',
      'Un agente revisará tu caso y te responderá a la brevedad.',
      0.65,
      now,
      now,
      null, // la IA no es un User, no tiene creatorId humano
      null,
    );
    const createdMessage = await this.messageRepository.create(initialMessage);

    return new Ticket(
      createdTicket.id,
      createdTicket.description,
      createdTicket.status,
      createdTicket.category,
      [createdMessage],
      createdTicket.createdAt,
      createdTicket.updatedAt,
      createdTicket.creatorId,
      createdTicket.updaterId,
    );
  }
}

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
import {
  RAG_QUERY_PORT,
  RagQueryPort,
} from '../../../domain/knowledge-base/rag-query.port';

@Injectable()
export class CreateTicketUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: MessageRepository,
    @Inject(RAG_QUERY_PORT)
    private readonly ragQueryPort: RagQueryPort,
  ) {}

  async execute(description: string, creatorId: string): Promise<Ticket> {
    // TODO: la categoría y el estado inicial del ticket siguen quemados.
    // La respuesta/confianza del primer mensaje de IA ya sale del RAG real.
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

    const { aiSuggestedResponse, confidenceScore } =
      await this.ragQueryPort.query(description);

    const initialMessage = new Message(
      randomUUID(),
      ticketId,
      MessageSenderType.AI,
      aiSuggestedResponse,
      aiSuggestedResponse,
      confidenceScore,
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

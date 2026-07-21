import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Ticket } from '../../../domain/tickets/ticket.entity';
import { TicketStatus } from '../../../domain/tickets/ticket-status.enum';
import {
  TICKET_REPOSITORY,
  TicketRepository,
} from '../../../domain/tickets/ticket.repository';
import {
  TICKET_AI_ANALYSIS_PORT,
  TicketAiAnalysisPort,
} from '../../../domain/tickets/ticket-ai-analysis.port';
import { Message } from '../../../domain/messages/message.entity';
import { MessageSenderType } from '../../../domain/messages/message-sender-type.enum';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from '../../../domain/messages/message.repository';

const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

const GENERIC_PENDING_MESSAGE =
  'Un agente revisará tu caso y te responderá a la brevedad.';

@Injectable()
export class CreateTicketUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: MessageRepository,
    @Inject(TICKET_AI_ANALYSIS_PORT)
    private readonly ticketAiAnalysisPort: TicketAiAnalysisPort,
    private readonly configService: ConfigService,
  ) {}

  async execute(description: string, creatorId: string): Promise<Ticket> {
    const now = new Date();
    const ticketId = randomUUID();

    const { category, aiSuggestedResponse, confidenceScore } =
      await this.ticketAiAnalysisPort.analyze(description);

    // A partir de este umbral se considera que la IA "resolvió" el ticket
    // (status RESOLVIENDO_IA) y su respuesta se muestra directamente al
    // cliente. Por debajo, el ticket queda PENDIENTE_AGENTE y el cliente ve
    // un mensaje genérico — la respuesta real de la IA queda en
    // Message.suggestedResponse, visible solo para el admin.
    //
    // RESOLVIENDO_IA nunca pasa solo a RESUELTO_IA: un admin tiene que
    // confirmarlo explícitamente (PATCH /tickets/:id/status), ver
    // UpdateTicketStatusUseCase. No se autocierra sin que un humano lo revise.
    const confidenceThreshold = Number(
      this.configService.get<string>(
        'AI_CONFIDENCE_THRESHOLD',
        String(DEFAULT_CONFIDENCE_THRESHOLD),
      ),
    );
    const isConfidentEnough = confidenceScore >= confidenceThreshold;
    const status = isConfidentEnough
      ? TicketStatus.AI_RESOLVING
      : TicketStatus.PENDING_AGENT;
    // Al cliente le mostramos la respuesta real solo si la confianza alcanza;
    // si no, un mensaje genérico. El borrador de la IA (suggestedResponse)
    // siempre se guarda completo para que el admin lo tenga disponible.
    const customerFacingContent = isConfidentEnough
      ? aiSuggestedResponse
      : GENERIC_PENDING_MESSAGE;

    const ticket = new Ticket(
      ticketId,
      description,
      status,
      category,
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
      customerFacingContent,
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

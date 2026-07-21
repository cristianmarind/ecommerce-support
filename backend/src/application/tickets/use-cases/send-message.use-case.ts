import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MessageSenderType } from '../../../domain/messages/message-sender-type.enum';
import { Message } from '../../../domain/messages/message.entity';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from '../../../domain/messages/message.repository';
import {
  TICKET_REPOSITORY,
  TicketRepository,
} from '../../../domain/tickets/ticket.repository';

@Injectable()
export class SendMessageUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: MessageRepository,
  ) {}

  async execute(
    ticketId: string,
    content: string,
    creatorId: string,
  ): Promise<Message> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} no encontrado`);
    }

    const now = new Date();
    const message = new Message(
      randomUUID(),
      ticketId,
      MessageSenderType.CUSTOMER,
      content,
      null,
      null,
      now,
      now,
      creatorId,
      creatorId,
    );

    return this.messageRepository.create(message);
  }
}

import { TicketCategory } from '../../../../domain/tickets/ticket-category.enum';
import { Ticket } from '../../../../domain/tickets/ticket.entity';
import { TicketStatus } from '../../../../domain/tickets/ticket-status.enum';
import { MessageResponseDto } from './message-response.dto';

export class TicketResponseDto {
  id: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory;
  messages: MessageResponseDto[];
  createdAt: Date;

  static fromDomain(ticket: Ticket): TicketResponseDto {
    const dto = new TicketResponseDto();
    dto.id = ticket.id;
    dto.description = ticket.description;
    dto.status = ticket.status;
    dto.category = ticket.category;
    dto.messages = ticket.messages.map(MessageResponseDto.fromDomain);
    dto.createdAt = ticket.createdAt;
    return dto;
  }
}

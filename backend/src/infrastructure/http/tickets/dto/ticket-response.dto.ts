import { TicketCategory } from '../../../../domain/tickets/ticket-category.enum';
import { Ticket } from '../../../../domain/tickets/ticket.entity';
import { TicketStatus } from '../../../../domain/tickets/ticket-status.enum';

export class TicketResponseDto {
  id: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory;
  suggestedResponse: string;
  createdAt: Date;

  static fromDomain(ticket: Ticket): TicketResponseDto {
    const dto = new TicketResponseDto();
    dto.id = ticket.id;
    dto.description = ticket.description;
    dto.status = ticket.status;
    dto.category = ticket.category;
    dto.suggestedResponse = ticket.suggestedResponse;
    dto.createdAt = ticket.createdAt;
    return dto;
  }
}

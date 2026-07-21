import { TicketCategory } from '../../../../domain/tickets/ticket-category.enum';
import { Ticket } from '../../../../domain/tickets/ticket.entity';
import { TicketStatus } from '../../../../domain/tickets/ticket-status.enum';
import { CustomerMessageResponseDto } from './customer-message-response.dto';

/** Versión recortada de TicketResponseDto para POST /tickets (cliente). */
export class CustomerTicketResponseDto {
  id: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory;
  messages: CustomerMessageResponseDto[];
  createdAt: Date;

  static fromDomain(ticket: Ticket): CustomerTicketResponseDto {
    const dto = new CustomerTicketResponseDto();
    dto.id = ticket.id;
    dto.description = ticket.description;
    dto.status = ticket.status;
    dto.category = ticket.category;
    dto.messages = ticket.messages.map(CustomerMessageResponseDto.fromDomain);
    dto.createdAt = ticket.createdAt;
    return dto;
  }
}

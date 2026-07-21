import { TicketResponseDto } from './ticket-response.dto';

export class PaginatedTicketsResponseDto {
  items: TicketResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

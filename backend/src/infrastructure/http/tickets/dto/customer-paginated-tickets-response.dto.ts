import { CustomerTicketResponseDto } from './customer-ticket-response.dto';

export class CustomerPaginatedTicketsResponseDto {
  items: CustomerTicketResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

import { TicketCategory } from './ticket-category.enum';
import { TicketStatus } from './ticket-status.enum';

export class Ticket {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly status: TicketStatus,
    public readonly category: TicketCategory,
    public readonly suggestedResponse: string,
    public readonly createdAt: Date,
  ) {}
}

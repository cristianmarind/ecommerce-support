import { AuditableFields } from '../common/auditable';
import { Message } from '../messages/message.entity';
import { TicketCategory } from './ticket-category.enum';
import { TicketStatus } from './ticket-status.enum';

export class Ticket implements AuditableFields {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly status: TicketStatus,
    public readonly category: TicketCategory,
    public readonly messages: Message[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly creatorId: string | null,
    public readonly updaterId: string | null,
  ) {}
}

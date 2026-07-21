import { AuditableFields } from '../common/auditable';
import { MessageSenderType } from './message-sender-type.enum';

export class Message implements AuditableFields {
  constructor(
    public readonly id: string,
    public readonly ticketId: string,
    public readonly senderType: MessageSenderType,
    public readonly content: string,
    public readonly suggestedResponse: string | null,
    public readonly confidenceScore: number | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly creatorId: string | null,
    public readonly updaterId: string | null,
  ) {}
}

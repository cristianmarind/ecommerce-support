import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { MessageSenderType } from '../../../../domain/messages/message-sender-type.enum';
import { AuditableBaseEntity } from './auditable.base-entity';
import { TicketTypeOrmEntity } from './ticket.typeorm-entity';

@Entity('messages')
export class MessageTypeOrmEntity extends AuditableBaseEntity {
  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => TicketTypeOrmEntity, (ticket) => ticket.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: TicketTypeOrmEntity;

  @Column({
    name: 'sender_type',
    type: 'enum',
    enum: MessageSenderType,
    enumName: 'messages_sender_type_enum',
  })
  senderType: MessageSenderType;

  @Column('text')
  content: string;

  @Column({ name: 'suggested_response', type: 'text', nullable: true })
  suggestedResponse: string | null;

  @Column({
    name: 'confidence_score',
    type: 'numeric',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  confidenceScore: string | null;
}

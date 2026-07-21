import { Column, Entity, OneToMany } from 'typeorm';
import { TicketCategory } from '../../../../domain/tickets/ticket-category.enum';
import { TicketStatus } from '../../../../domain/tickets/ticket-status.enum';
import { AuditableBaseEntity } from './auditable.base-entity';
import { MessageTypeOrmEntity } from './message.typeorm-entity';

@Entity('tickets')
export class TicketTypeOrmEntity extends AuditableBaseEntity {
  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    enumName: 'tickets_status_enum',
  })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketCategory,
    enumName: 'tickets_category_enum',
  })
  category: TicketCategory;

  @OneToMany(() => MessageTypeOrmEntity, (message) => message.ticket)
  messages: MessageTypeOrmEntity[];
}

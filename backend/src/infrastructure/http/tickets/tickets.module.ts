import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateTicketUseCase } from '../../../application/tickets/use-cases/create-ticket.use-case';
import { ListTicketsUseCase } from '../../../application/tickets/use-cases/list-tickets.use-case';
import { SendMessageUseCase } from '../../../application/tickets/use-cases/send-message.use-case';
import { UpdateTicketStatusUseCase } from '../../../application/tickets/use-cases/update-ticket-status.use-case';
import { MESSAGE_REPOSITORY } from '../../../domain/messages/message.repository';
import { TICKET_REPOSITORY } from '../../../domain/tickets/ticket.repository';
import { KnowledgeBaseModule } from '../../knowledge-base/knowledge-base.module';
import { MessageTypeOrmEntity } from '../../persistence/typeorm/entities/message.typeorm-entity';
import { TicketTypeOrmEntity } from '../../persistence/typeorm/entities/ticket.typeorm-entity';
import { MessageTypeOrmRepository } from '../../persistence/typeorm/repositories/message.typeorm-repository';
import { TicketTypeOrmRepository } from '../../persistence/typeorm/repositories/ticket.typeorm-repository';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketTypeOrmEntity, MessageTypeOrmEntity]),
    KnowledgeBaseModule,
  ],
  controllers: [TicketsController],
  providers: [
    CreateTicketUseCase,
    ListTicketsUseCase,
    SendMessageUseCase,
    UpdateTicketStatusUseCase,
    {
      provide: TICKET_REPOSITORY,
      useClass: TicketTypeOrmRepository,
    },
    {
      provide: MESSAGE_REPOSITORY,
      useClass: MessageTypeOrmRepository,
    },
  ],
})
export class TicketsModule {}

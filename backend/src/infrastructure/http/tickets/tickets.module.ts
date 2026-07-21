import { Module } from '@nestjs/common';
import { CreateTicketUseCase } from '../../../application/tickets/use-cases/create-ticket.use-case';
import { ListTicketsUseCase } from '../../../application/tickets/use-cases/list-tickets.use-case';
import { TICKET_REPOSITORY } from '../../../domain/tickets/ticket.repository';
import { InMemoryTicketRepository } from '../../persistence/in-memory/in-memory-ticket.repository';
import { TicketsController } from './tickets.controller';

@Module({
  controllers: [TicketsController],
  providers: [
    CreateTicketUseCase,
    ListTicketsUseCase,
    {
      provide: TICKET_REPOSITORY,
      useClass: InMemoryTicketRepository,
    },
  ],
})
export class TicketsModule {}

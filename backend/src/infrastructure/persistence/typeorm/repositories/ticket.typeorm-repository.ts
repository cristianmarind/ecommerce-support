import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../../../../domain/messages/message.entity';
import { Ticket } from '../../../../domain/tickets/ticket.entity';
import { TicketStatus } from '../../../../domain/tickets/ticket-status.enum';
import {
  PaginatedResult,
  TicketRepository,
} from '../../../../domain/tickets/ticket.repository';
import { MessageTypeOrmEntity } from '../entities/message.typeorm-entity';
import { TicketTypeOrmEntity } from '../entities/ticket.typeorm-entity';

@Injectable()
export class TicketTypeOrmRepository implements TicketRepository {
  constructor(
    @InjectRepository(TicketTypeOrmEntity)
    private readonly ticketRepo: Repository<TicketTypeOrmEntity>,
  ) {}

  async create(ticket: Ticket): Promise<Ticket> {
    const entity = this.ticketRepo.create({
      id: ticket.id,
      description: ticket.description,
      status: ticket.status,
      category: ticket.category,
      creatorId: ticket.creatorId,
      updaterId: ticket.updaterId,
    });
    const saved = await this.ticketRepo.save(entity);
    return this.toDomain(saved, ticket.messages);
  }

  async findById(id: string): Promise<Ticket | null> {
    const entity = await this.ticketRepo.findOne({
      where: { id },
      relations: { messages: true },
      order: { messages: { createdAt: 'ASC' } },
    });
    if (!entity) return null;

    return this.toDomain(
      entity,
      (entity.messages ?? []).map((message) => this.messageToDomain(message)),
    );
  }

  async findAll(page: number, limit: number): Promise<PaginatedResult<Ticket>> {
    const [entities, total] = await this.ticketRepo.findAndCount({
      relations: { messages: true },
      order: { createdAt: 'DESC', messages: { createdAt: 'ASC' } },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: entities.map((entity) =>
        this.toDomain(
          entity,
          (entity.messages ?? []).map((message) => this.messageToDomain(message)),
        ),
      ),
      total,
      page,
      limit,
    };
  }

  async updateStatus(
    id: string,
    status: TicketStatus,
    updaterId: string,
  ): Promise<Ticket> {
    await this.ticketRepo.update({ id }, { status, updaterId });
    // El use case ya valida que el ticket exista antes de llamar esto.
    return (await this.findById(id)) as Ticket;
  }

  private toDomain(entity: TicketTypeOrmEntity, messages: Message[]): Ticket {
    return new Ticket(
      entity.id,
      entity.description,
      entity.status,
      entity.category,
      messages,
      entity.createdAt,
      entity.updatedAt,
      entity.creatorId,
      entity.updaterId,
    );
  }

  private messageToDomain(entity: MessageTypeOrmEntity): Message {
    return new Message(
      entity.id,
      entity.ticketId,
      entity.senderType,
      entity.content,
      entity.suggestedResponse,
      entity.confidenceScore === null ? null : Number(entity.confidenceScore),
      entity.createdAt,
      entity.updatedAt,
      entity.creatorId,
      entity.updaterId,
    );
  }
}

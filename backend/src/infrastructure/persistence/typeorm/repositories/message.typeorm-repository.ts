import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../../../../domain/messages/message.entity';
import { MessageRepository } from '../../../../domain/messages/message.repository';
import { MessageTypeOrmEntity } from '../entities/message.typeorm-entity';

@Injectable()
export class MessageTypeOrmRepository implements MessageRepository {
  constructor(
    @InjectRepository(MessageTypeOrmEntity)
    private readonly messageRepo: Repository<MessageTypeOrmEntity>,
  ) {}

  async create(message: Message): Promise<Message> {
    const entity = this.messageRepo.create({
      id: message.id,
      ticketId: message.ticketId,
      senderType: message.senderType,
      content: message.content,
      suggestedResponse: message.suggestedResponse,
      confidenceScore:
        message.confidenceScore === null
          ? null
          : message.confidenceScore.toString(),
      creatorId: message.creatorId,
      updaterId: message.updaterId,
    });
    const saved = await this.messageRepo.save(entity);
    return this.toDomain(saved);
  }

  private toDomain(entity: MessageTypeOrmEntity): Message {
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

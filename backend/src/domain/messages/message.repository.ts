import { Message } from './message.entity';

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');

export interface MessageRepository {
  create(message: Message): Promise<Message>;
}
